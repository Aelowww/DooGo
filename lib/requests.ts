import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { urgencyInfo, type BloodType, type Urgency } from "@/lib/blood";
import { openConversation, sendMessage } from "@/lib/messages";
import { closeNeed, getNeed, isCovered, newNeedId, openNeed, pledgeUnit, recordUnitDonated } from "@/lib/needs";
import { notify } from "@/lib/notifications";

export type RequestStatus = "pending" | "accepted" | "declined" | "completed" | "cancelled";

export type BloodRequest = {
  id: string;
  requesterId: string;
  requesterName: string;
  donorId: string;
  donorName: string;
  bloodType: BloodType;
  quantity: number;
  location: string;
  reason: string;
  /** Older requests (before urgency existed) read as "standard". */
  urgency?: Urgency;
  hospital?: string;
  /** Day the blood is needed by (YYYY-MM-DD). */
  neededBy?: string;
  /** End of the needed-by day. Firestore rules refuse to accept a request after this. */
  expiresAt?: Timestamp;
  status: RequestStatus;
  createdAt?: Timestamp;
  respondedAt?: Timestamp;
  completedAt?: Timestamp;
  /** Public need this request counts toward (shared by requests sent together). */
  needId?: string;
};

export type NewBloodRequest = Pick<BloodRequest, "requesterId" | "requesterName" | "donorId" | "donorName" | "bloodType" | "quantity" | "location" | "reason"> & {
  urgency: Urgency;
  hospital: string;
  neededBy: string;
};

/** What the UI shows: a pending request past its needed-by date reads as "expired". */
export type DisplayStatus = RequestStatus | "expired";

export const statusLabel: Record<DisplayStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  declined: "Declined",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function isExpired(request: Pick<BloodRequest, "expiresAt">, now = Date.now()) {
  return Boolean(request.expiresAt && request.expiresAt.toMillis() < now);
}

export function displayStatus(request: BloodRequest): DisplayStatus {
  return request.status === "pending" && isExpired(request) ? "expired" : request.status;
}

/** Most urgent first, then soonest needed, then newest. */
export function byUrgency(a: BloodRequest, b: BloodRequest) {
  return urgencyInfo[a.urgency ?? "standard"].rank - urgencyInfo[b.urgency ?? "standard"].rank
    || (a.neededBy ?? "9999").localeCompare(b.neededBy ?? "9999")
    || newestFirst(a, b);
}

function endOfDay(isoDate: string) {
  return Timestamp.fromDate(new Date(`${isoDate}T23:59:59`));
}

const requestsCollection = () => collection(db(), "requests");

function newestFirst(a: BloodRequest, b: BloodRequest) {
  return (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now());
}

/** The requester's pending or accepted request to this donor, if any — used to prevent duplicate requests. */
export async function findOpenRequest(requesterId: string, donorId: string) {
  const snapshot = await getDocs(query(requestsCollection(), where("requesterId", "==", requesterId), where("donorId", "==", donorId)));
  const open = snapshot.docs
    .map((item) => ({ ...(item.data() as Omit<BloodRequest, "id">), id: item.id }))
    .filter((item) => item.status === "pending" || item.status === "accepted");
  return open.sort(newestFirst)[0] ?? null;
}

/** Keeps the public city count in sync. Never blocks the request itself if it fails. */
async function syncNeed(action: () => Promise<unknown>) {
  try {
    await action();
  } catch (error) {
    console.warn("Couldn't update the public request count", error);
  }
}

/** `needId` groups requests sent together; a single request opens its own need. */
export async function createRequest(request: NewBloodRequest, needId?: string) {
  const id = needId ?? newNeedId();
  const expiresAt = endOfDay(request.neededBy);
  const ref = await addDoc(requestsCollection(), {
    ...request,
    needId: id,
    status: "pending",
    expiresAt,
    createdAt: serverTimestamp(),
  });
  if (!needId) {
    await syncNeed(() => openNeed(id, { requesterId: request.requesterId, bloodType: request.bloodType, location: request.location, urgency: request.urgency, quantity: request.quantity, donorIds: [request.donorId], expiresAt }));
  }
  const urgent = request.urgency === "standard" ? "" : `${urgencyInfo[request.urgency].label}: `;
  await notify({
    userId: request.donorId,
    actorId: request.requesterId,
    type: "request",
    title: `${urgent}${request.requesterName} needs ${request.bloodType} blood`,
    link: `/requests/${ref.id}`,
  });
  return ref.id;
}

/**
 * Sends the same request to several donors at once, skipping anyone the requester
 * already has an open request with. Returns how many requests were sent.
 */
export async function createRequests(base: Omit<NewBloodRequest, "donorId" | "donorName">, donors: { uid: string; name: string }[]) {
  const needId = newNeedId();
  const askedIds: string[] = [];
  for (const donor of donors) {
    if (await findOpenRequest(base.requesterId, donor.uid)) continue;
    await createRequest({ ...base, donorId: donor.uid, donorName: donor.name }, needId);
    askedIds.push(donor.uid);
  }
  if (askedIds.length) {
    await syncNeed(() => openNeed(needId, { requesterId: base.requesterId, bloodType: base.bloodType, location: base.location, urgency: base.urgency, quantity: base.quantity, donorIds: askedIds, expiresAt: endOfDay(base.neededBy) }));
  }
  return askedIds.length;
}

export function subscribeRequests(
  field: "requesterId" | "donorId",
  uid: string,
  onChange: (requests: BloodRequest[]) => void,
  onError?: (error: Error) => void,
) {
  return onSnapshot(
    query(requestsCollection(), where(field, "==", uid)),
    (snapshot) => onChange(snapshot.docs.map((item) => ({ ...(item.data() as Omit<BloodRequest, "id">), id: item.id })).sort(newestFirst)),
    onError,
  );
}

export function subscribeRequest(id: string, onChange: (request: BloodRequest | null) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    doc(db(), "requests", id),
    (snapshot) => onChange(snapshot.exists() ? ({ ...(snapshot.data() as Omit<BloodRequest, "id">), id: snapshot.id }) : null),
    onError,
  );
}

/** Donor accepts or declines a pending request. */
export async function respondToRequest(request: BloodRequest, status: "accepted" | "declined") {
  await updateDoc(doc(db(), "requests", request.id), { status, respondedAt: serverTimestamp() });
  await notify({
    userId: request.requesterId,
    actorId: request.donorId,
    type: status,
    title: `${request.donorName} ${status} your blood request`,
    link: `/requests/${request.id}`,
  });
}

/** Donor confirms the donation happened. */
export async function completeRequest(request: BloodRequest) {
  await updateDoc(doc(db(), "requests", request.id), { status: "completed", completedAt: serverTimestamp() });
  if (request.needId) await syncNeed(() => recordUnitDonated(request.needId!));
  await notify({
    userId: request.requesterId,
    actorId: request.donorId,
    type: "completed",
    title: `${request.donorName} marked your request as donated`,
    link: `/requests/${request.id}`,
  });
}

/** Requester withdraws a request that hasn't been answered yet. */
export async function cancelRequest(request: BloodRequest) {
  await updateDoc(doc(db(), "requests", request.id), { status: "cancelled", respondedAt: serverTimestamp() });
  const { needId } = request;
  if (!needId) return;
  // The need stays open while any other donor asked in the same batch might still help.
  await syncNeed(async () => {
    const siblings = await getDocs(query(requestsCollection(), where("requesterId", "==", request.requesterId), where("needId", "==", needId)));
    const stillOpen = siblings.docs.some((item) => item.id !== request.id && ["pending", "accepted"].includes(item.data().status));
    if (!stillOpen) await closeNeed(needId);
  });
}

/**
 * Donor accepts and immediately opens the chat with an opening message, so the
 * seeker knows who's coming and they can agree on a time. Returns the conversation id.
 */
export async function acceptAndConnect(request: BloodRequest) {
  // Another donor may have filled the last bag while this one was deciding.
  const need = request.needId ? await getNeed(request.needId).catch(() => null) : null;
  if (isCovered(need)) throw new Error("covered");
  await respondToRequest(request, "accepted");
  if (request.needId) await syncNeed(() => pledgeUnit(request.needId!));
  const donor = { uid: request.donorId, name: request.donorName };
  const seeker = { uid: request.requesterId, name: request.requesterName };
  const conversationId = await openConversation(donor, seeker);
  const where = request.hospital ? ` at ${request.hospital}` : "";
  await sendMessage(
    { id: conversationId, participants: [donor.uid, seeker.uid].sort() as [string, string], names: {}, lastMessage: "", lastSenderId: null, unread: {} },
    donor.uid,
    `Hi ${request.requesterName.split(" ")[0]}! I've accepted your request for ${request.bloodType} blood${where}. When should I come in?`,
  );
  return conversationId;
}

/** The donor's accepted request they haven't donated for yet, if any. A donor gives one unit at a time. */
export async function findActiveCommitment(donorId: string) {
  const snapshot = await getDocs(query(requestsCollection(), where("donorId", "==", donorId), where("status", "==", "accepted")));
  const first = snapshot.docs[0];
  return first ? ({ ...(first.data() as Omit<BloodRequest, "id">), id: first.id }) : null;
}

/**
 * After donating, a donor can't give again until `eligibleOn` (YYYY-MM-DD). Pending requests that need
 * blood before then are declined automatically, so those seekers know to look for someone else.
 */
export async function releaseRequestsDuringRecovery(donorId: string, eligibleOn: string) {
  const snapshot = await getDocs(query(requestsCollection(), where("donorId", "==", donorId), where("status", "==", "pending")));
  const now = Date.now();
  for (const item of snapshot.docs) {
    const request = { ...(item.data() as Omit<BloodRequest, "id">), id: item.id };
    if (isExpired(request, now) || (request.neededBy && request.neededBy >= eligibleOn)) continue;
    await updateDoc(doc(db(), "requests", request.id), { status: "declined", respondedAt: serverTimestamp() });
    await notify({
      userId: request.requesterId,
      actorId: donorId,
      type: "declined",
      title: `${request.donorName} just donated and can't give again before your needed-by date. Try another donor.`,
      link: `/requests/${request.id}`,
    });
  }
}
