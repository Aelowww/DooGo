import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { compatibleDonorTypes, hasMedicalRecord, nextEligibleDate, toBloodType, type BloodGroup, type BloodType, type MedicalRecordSummary, type RhFactor } from "@/lib/blood";
import { shortName, todayISO } from "@/lib/format";

export type PrivacySettings = {
  showProfile: boolean;
  showBloodType: boolean;
  allowLocation: boolean;
  showDonationHistory: boolean;
};

export type NotificationSettings = {
  email: boolean;
  sms: boolean;
};

/** Private profile — `users/{uid}`, readable only by its owner. */
export type UserProfile = {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  photoURL: string | null;
  bloodGroup: BloodGroup | null;
  rhFactor: RhFactor | null;
  bloodType: BloodType | null;
  location: string | null;
  available: boolean;
  lastDonation: string | null;
  totalDonations: number;
  about: string;
  /** Summary of the uploaded medical record. Required to appear in donor searches. */
  medicalRecord: MedicalRecordSummary | null;
  /** False until a new account finishes the setup flow (/onboarding). Older accounts count as onboarded. */
  onboarded: boolean;
  privacy: PrivacySettings;
  notifications: NotificationSettings;
  createdAt?: Timestamp;
};

/** Public donor card — `donors/{uid}`, readable by any signed-in user. Derived from the private profile. */
export type DonorProfile = {
  uid: string;
  name: string;
  bloodType: BloodType | null;
  location: string | null;
  available: boolean;
  searchable: boolean;
  lastDonation: string | null;
  /** Has a medical record on file (the record itself stays private). */
  verified?: boolean;
  /** First day this donor can give blood again (12 weeks after their last donation for men, 16 weeks otherwise). Null if they never donated. */
  eligibleFrom: string | null;
  about: string;
  photoURL: string | null;
  lastActiveAt?: Timestamp;
};

export const defaultPrivacy: PrivacySettings = {
  showProfile: true,
  showBloodType: true,
  allowLocation: false,
  showDonationHistory: true,
};

export const defaultNotifications: NotificationSettings = { email: true, sms: false };

const userRef = (uid: string) => doc(db(), "users", uid);
const donorRef = (uid: string) => doc(db(), "donors", uid);

export function normalizeProfile(uid: string, data: Partial<UserProfile>): UserProfile {
  return {
    uid,
    fullName: data.fullName || "",
    email: data.email || "",
    phone: data.phone || "",
    dateOfBirth: data.dateOfBirth || "",
    gender: data.gender || "",
    photoURL: data.photoURL ?? null,
    bloodGroup: data.bloodGroup ?? null,
    rhFactor: data.rhFactor ?? null,
    bloodType: data.bloodType ?? toBloodType(data.bloodGroup, data.rhFactor),
    location: data.location ?? null,
    available: data.available ?? false,
    lastDonation: data.lastDonation ?? null,
    totalDonations: data.totalDonations ?? 0,
    about: data.about || "",
    medicalRecord: data.medicalRecord ?? null,
    onboarded: data.onboarded ?? true,
    privacy: { ...defaultPrivacy, ...data.privacy },
    notifications: { ...defaultNotifications, ...data.notifications },
    createdAt: data.createdAt,
  };
}

function publicCard(profile: UserProfile): Omit<DonorProfile, "lastActiveAt"> {
  return {
    uid: profile.uid,
    name: shortName(profile.fullName),
    bloodType: profile.privacy.showBloodType ? profile.bloodType : null,
    location: profile.location,
    available: profile.available,
    searchable: profile.available
      && profile.privacy.showProfile
      && Boolean(profile.bloodType && profile.location)
      && hasMedicalRecord(profile),
    lastDonation: profile.privacy.showDonationHistory ? profile.lastDonation : null,
    eligibleFrom: profile.lastDonation ? todayISO(nextEligibleDate(profile.lastDonation, profile.gender)) : null,
    verified: hasMedicalRecord(profile),
    about: profile.about,
    photoURL: profile.photoURL,
  };
}

export async function createUserProfile(uid: string, fullName: string, email: string) {
  const profile = normalizeProfile(uid, { fullName, email, onboarded: false });
  await setDoc(userRef(uid), { ...profile, createdAt: serverTimestamp() });
  await setDoc(donorRef(uid), { ...publicCard(profile), lastActiveAt: serverTimestamp() });
  return profile;
}

export function subscribeUserProfile(uid: string, onChange: (profile: UserProfile | null) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    userRef(uid),
    (snapshot) => onChange(snapshot.exists() ? normalizeProfile(uid, snapshot.data() as Partial<UserProfile>) : null),
    onError,
  );
}

/**
 * Saves only the changed fields of the private profile and refreshes the public donor card,
 * in one atomic batch so the two never disagree.
 */
export async function updateUserProfile(current: UserProfile, changes: Partial<Omit<UserProfile, "uid" | "createdAt" | "bloodType">>) {
  const next = normalizeProfile(current.uid, { ...current, ...changes });
  next.bloodType = toBloodType(next.bloodGroup, next.rhFactor);
  const writes: Record<string, unknown> = { ...changes };
  if ("bloodGroup" in changes || "rhFactor" in changes) writes.bloodType = next.bloodType;
  const batch = writeBatch(db());
  batch.update(userRef(current.uid), writes);
  batch.set(donorRef(current.uid), publicCard(next), { merge: true });
  await batch.commit();
  return next;
}

/** Records a completed donation: bumps the count atomically and restarts the recovery window. */
export async function recordDonation(current: UserProfile, date = todayISO()) {
  const next = normalizeProfile(current.uid, { ...current, lastDonation: date, totalDonations: current.totalDonations + 1 });
  const batch = writeBatch(db());
  batch.update(userRef(current.uid), { lastDonation: date, totalDonations: increment(1) });
  batch.set(donorRef(current.uid), publicCard(next), { merge: true });
  await batch.commit();
}

export async function touchLastActive(uid: string) {
  await setDoc(donorRef(uid), { lastActiveAt: serverTimestamp() }, { merge: true });
}

export async function getDonor(uid: string) {
  const snapshot = await getDoc(donorRef(uid));
  return snapshot.exists() ? ({ ...(snapshot.data() as DonorProfile), uid }) : null;
}

export function subscribeDonor(uid: string, onChange: (donor: DonorProfile | null) => void) {
  return onSnapshot(donorRef(uid), (snapshot) => onChange(snapshot.exists() ? ({ ...(snapshot.data() as DonorProfile), uid }) : null));
}

export function isDonorEligible(donor: Pick<DonorProfile, "eligibleFrom">, today = todayISO()) {
  return !donor.eligibleFrom || donor.eligibleFrom <= today;
}

/**
 * Available, visible donors whose blood type is compatible with `recipient`, in `location` (or anywhere when null).
 * Eligible donors come first, then exact blood-type matches, then by name.
 */
/** Compatible donors in any of `locations` (null = every city), eligible and exact matches first. */
export async function searchDonors(recipient: BloodType, locations: readonly string[] | null, excludeUid: string) {
  const compatible = compatibleDonorTypes(recipient);
  // Firestore allows only one "in" per query here: filter by city in the query, blood type afterwards.
  const filters = locations?.length
    ? [where("searchable", "==", true), where("location", "in", locations.slice(0, 10))]
    : [where("searchable", "==", true), where("bloodType", "in", compatible)];
  const snapshot = await getDocs(query(collection(db(), "donors"), ...filters));
  const today = todayISO();
  return snapshot.docs
    .map((item) => ({ ...(item.data() as Partial<DonorProfile>), eligibleFrom: item.data().eligibleFrom ?? null, uid: item.id }) as DonorProfile)
    .filter((donor) => donor.uid !== excludeUid && donor.bloodType !== null && compatible.includes(donor.bloodType))
    .sort((a, b) =>
      Number(isDonorEligible(b, today)) - Number(isDonorEligible(a, today))
      || Number(b.bloodType === recipient) - Number(a.bloodType === recipient)
      || a.name.localeCompare(b.name));
}

/**
 * Removes everything the user owns: their medical record (health data), notifications,
 * public donor card, and private profile. Requests and chats stay with the other person.
 */
export async function deleteUserData(uid: string) {
  await deleteDoc(doc(db(), "medicalRecords", uid));
  const notifications = await getDocs(query(collection(db(), "notifications"), where("userId", "==", uid)));
  await Promise.all(notifications.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(donorRef(uid));
  await deleteDoc(userRef(uid));
}

export function isActiveNow(lastActiveAt: Timestamp | undefined, now = Date.now()) {
  return Boolean(lastActiveAt && now - lastActiveAt.toMillis() < 5 * 60_000);
}

/** How many visible, available donors of each blood type are in a city — the "Donors near you" panel. */
export async function countDonorsByType(location: string, excludeUid?: string) {
  const snapshot = await getDocs(query(collection(db(), "donors"), where("searchable", "==", true), where("location", "==", location)));
  const counts: Partial<Record<BloodType, number>> = {};
  for (const item of snapshot.docs) {
    if (item.id === excludeUid) continue;
    const type = (item.data() as DonorProfile).bloodType;
    if (type) counts[type] = (counts[type] ?? 0) + 1;
  }
  return counts;
}
