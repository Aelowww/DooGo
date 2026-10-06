import { collection, doc, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { BloodType, Urgency } from "@/lib/blood";

/**
 * Public, anonymous summary of one blood request (a broadcast to several donors is one need).
 * Requests themselves are private to the two people involved; needs only carry city, type, urgency
 * and progress, so everyone can see how much blood is being asked for — and donors can see when
 * a request is already covered.
 *
 * One donor gives one unit (~450 ml), so a 3-bag need is covered once 3 donors agree,
 * and fulfilled once 3 have donated.
 */
export type Need = {
  id: string;
  requesterId: string;
  bloodType: BloodType;
  location: string;
  urgency: Urgency;
  /** Bags needed in total. */
  quantity: number;
  /** Donors who accepted (each pledges one unit). */
  pledged: number;
  /** Units actually donated. */
  donated: number;
  /** Donors asked; only they can pledge or record a donation. */
  donorIds: string[];
  open: boolean;
  expiresAt: Timestamp;
};

type NewNeed = Omit<Need, "id" | "open" | "pledged" | "donated">;

const needsCollection = () => collection(db(), "needs");
const needRef = (id: string) => doc(needsCollection(), id);

export const newNeedId = () => doc(needsCollection()).id;

function fromData(id: string, data: Record<string, unknown>): Need {
  // Needs created before unit tracking have no counters yet.
  const need = data as Partial<Omit<Need, "id">>;
  return { ...(need as Omit<Need, "id">), pledged: need.pledged ?? 0, donated: need.donated ?? 0, quantity: need.quantity ?? 1, id };
}

export function openNeed(id: string, need: NewNeed) {
  return setDoc(needRef(id), { ...need, pledged: 0, donated: 0, open: true, createdAt: serverTimestamp() });
}

export async function getNeed(id: string) {
  const snapshot = await getDoc(needRef(id));
  return snapshot.exists() ? fromData(snapshot.id, snapshot.data()) : null;
}

export function subscribeNeed(id: string, onChange: (need: Need | null) => void) {
  return onSnapshot(needRef(id), (snapshot) => onChange(snapshot.exists() ? fromData(snapshot.id, snapshot.data()) : null), () => onChange(null));
}

/** Enough donors have agreed to give every bag. */
export const isCovered = (need: Pick<Need, "pledged" | "quantity"> | null | undefined) => Boolean(need && need.pledged >= need.quantity);

/** A donor accepted: one more unit promised. */
export function pledgeUnit(id: string) {
  return updateDoc(needRef(id), { pledged: increment(1) });
}

/** A donor gave their unit. The need closes once every bag has been donated. */
export async function recordUnitDonated(id: string) {
  const need = await getNeed(id);
  if (!need) return;
  const donated = need.donated + 1;
  await updateDoc(needRef(id), donated >= need.quantity ? { donated: increment(1), open: false, closedAt: serverTimestamp() } : { donated: increment(1) });
}

export function closeNeed(id: string) {
  return updateDoc(needRef(id), { open: false, closedAt: serverTimestamp() });
}

/** Open, unexpired blood requests in a city. */
export async function countOpenNeeds(location: string, now = Date.now()) {
  const snapshot = await getDocs(query(needsCollection(), where("location", "==", location), where("open", "==", true)));
  return snapshot.docs.filter((item) => ((item.data().expiresAt as Timestamp | undefined)?.toMillis() ?? 0) > now).length;
}
