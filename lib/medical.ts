import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { MedicalRecordKind, MedicalRecordSummary } from "@/lib/blood";
import { todayISO } from "@/lib/format";
import { updateUserProfile, type UserProfile } from "@/lib/users";

/** Full record — `medicalRecords/{uid}`, readable only by its owner. */
export type MedicalRecord = MedicalRecordSummary & { image: string };

const recordRef = (uid: string) => doc(db(), "medicalRecords", uid);

export async function getMedicalRecord(uid: string) {
  const snapshot = await getDoc(recordRef(uid));
  return snapshot.exists() ? (snapshot.data() as MedicalRecord) : null;
}

/** Saves the document image privately and a summary on the profile (which drives the public "verified" badge). */
export async function saveMedicalRecord(profile: UserProfile, details: { kind: MedicalRecordKind; issuer: string; issuedOn: string; image: string }) {
  const summary: MedicalRecordSummary = { kind: details.kind, issuer: details.issuer, issuedOn: details.issuedOn, uploadedAt: todayISO() };
  await setDoc(recordRef(profile.uid), { ...summary, image: details.image, updatedAt: serverTimestamp() });
  return updateUserProfile(profile, { medicalRecord: summary });
}

export async function removeMedicalRecord(profile: UserProfile) {
  await deleteDoc(recordRef(profile.uid));
  // Without a record you can't stay visible to seekers.
  return updateUserProfile(profile, { medicalRecord: null, available: false });
}
