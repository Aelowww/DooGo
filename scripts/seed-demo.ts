/**
 * Seeds demo accounts and activity so every screen has something to show.
 *
 *   npx tsx --env-file=.env.local scripts/seed-demo.ts
 *
 * All accounts use the password below. Run it once; running again reuses the
 * accounts and skips the activity if it was already created.
 */
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, firebaseAuth } from "@/lib/firebase/client";
import type { BloodGroup, RhFactor, Urgency } from "@/lib/blood";
import { shortName, todayISO } from "@/lib/format";
import { saveMedicalRecord } from "@/lib/medical";
import { openNeed } from "@/lib/needs";
import { openConversation, sendMessage, type Conversation } from "@/lib/messages";
import { acceptAndConnect, cancelRequest, completeRequest, createRequest, respondToRequest, type BloodRequest } from "@/lib/requests";
import { createUserProfile, normalizeProfile, recordDonation, updateUserProfile, type UserProfile } from "@/lib/users";

const password = "DooGo1234!";
// 1×1 PNG standing in for a photographed document.
const placeholderRecord = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

type Person = {
  key: string;
  email: string;
  name: string;
  group?: BloodGroup;
  rh?: RhFactor;
  location?: string;
  available?: boolean;
  lastDonation?: string | null;
  totalDonations?: number;
  phone?: string;
  dob?: string;
  gender?: string;
  about?: string;
  onboarded?: boolean;
};

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return todayISO(date);
}

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

const people: Person[] = [
  { key: "carl", email: "carl.demo@doogo.test", name: "Carl Demo", group: "O", rh: "+", location: "Iloilo City", available: true, lastDonation: daysAgo(80), totalDonations: 4, phone: "+63 912 345 6789", dob: "1998-05-14", gender: "Male", about: "Regular donor. Free most afternoons." },
  { key: "maria", email: "maria.santos@doogo.test", name: "Maria Santos", group: "A", rh: "+", location: "Iloilo City", available: true, lastDonation: daysAgo(120), totalDonations: 2, about: "Nurse at Iloilo Doctors' Hospital." },
  { key: "james", email: "james.reyes@doogo.test", name: "James Reyes", group: "O", rh: "-", location: "Iloilo City", available: true, lastDonation: daysAgo(200), totalDonations: 6, about: "Universal donor, happy to help." },
  { key: "ana", email: "ana.cruz@doogo.test", name: "Ana Cruz", group: "O", rh: "+", location: "Iloilo City", available: true, lastDonation: null, totalDonations: 0, about: "First-time donor." },
  { key: "paolo", email: "paolo.garcia@doogo.test", name: "Paolo Garcia", group: "O", rh: "-", location: "Iloilo City", available: true, lastDonation: daysAgo(90), totalDonations: 3 },
  { key: "lea", email: "lea.mendoza@doogo.test", name: "Lea Mendoza", group: "B", rh: "+", location: "Iloilo City", available: true, lastDonation: daysAgo(70), totalDonations: 1 },
  { key: "ben", email: "ben.torres@doogo.test", name: "Ben Torres", group: "AB", rh: "+", location: "Iloilo City", available: true, lastDonation: daysAgo(12), totalDonations: 5, about: "Recently donated — back in a few weeks." },
  { key: "joy", email: "joy.flores@doogo.test", name: "Joy Flores", group: "O", rh: "+", location: "Oton", available: true, lastDonation: daysAgo(100), totalDonations: 2 },
  { key: "newbie", email: "new.user@doogo.test", name: "Nina Newcomer", onboarded: false },
  // End-to-end journey: Tess needs blood for her mother, Dan donates.
  { key: "tess", email: "tess.seeker@doogo.test", name: "Tess Villanueva", group: "A", rh: "+", location: "Iloilo City", available: true, lastDonation: null, totalDonations: 0, phone: "+63 917 555 0142", about: "Looking for donors for my mother. Also happy to donate." },
  { key: "dan", email: "dan.donor@doogo.test", name: "Dan Lim", group: "O", rh: "-", location: "Iloilo City", available: true, lastDonation: daysAgo(150), totalDonations: 3, phone: "+63 918 555 0199", about: "O- donor. Free on weekday mornings." },
];

const uids: Record<string, string> = {};

async function signInAs(person: Person) {
  await signOut(firebaseAuth()).catch(() => {});
  const { user } = await signInWithEmailAndPassword(firebaseAuth(), person.email, password);
  return user;
}

async function profileOf(uid: string): Promise<UserProfile> {
  const snapshot = await getDoc(doc(db(), "users", uid));
  return normalizeProfile(uid, snapshot.data() as Partial<UserProfile>);
}

async function ensureAccount(person: Person) {
  try {
    const { user } = await createUserWithEmailAndPassword(firebaseAuth(), person.email, password);
    await updateProfile(user, { displayName: person.name });
    await createUserProfile(user.uid, person.name, person.email);
    console.log(`created  ${person.email}`);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/email-already-in-use") throw error;
    console.log(`exists   ${person.email}`);
  }
  const user = await signInAs(person);
  uids[person.key] = user.uid;

  const current = await profileOf(user.uid);
  await updateUserProfile(current, {
    fullName: person.name,
    phone: person.phone ?? "",
    dateOfBirth: person.dob ?? "",
    gender: person.gender ?? "",
    about: person.about ?? "",
    onboarded: person.onboarded ?? true,
    ...(person.group
      ? {
        bloodGroup: person.group,
        rhFactor: person.rh!,
        location: person.location!,
        available: person.available ?? false,
        lastDonation: person.lastDonation ?? null,
        totalDonations: person.totalDonations ?? 0,
      }
      : {}),
  });

  // Donors need a medical record on file to show up in searches.
  if (person.group) {
    await saveMedicalRecord(await profileOf(user.uid), {
      kind: "Blood typing result",
      issuer: `${person.location} Blood Center`,
      issuedOn: daysAgo(40),
      image: placeholderRecord,
    });
  }
}

const byKey = (key: string) => people.find((person) => person.key === key)!;

let step = "";
function track(label: string) {
  step = label;
  console.log(`… ${label}`);
}

/** One person asks another for blood. Returns the request with its id. */
async function ask(fromKey: string, toKey: string, details: { bloodType: BloodRequest["bloodType"]; urgency: Urgency; hospital: string; reason: string; quantity: number; neededIn: number }) {
  track(`${fromKey} asks ${toKey} for ${details.bloodType}`);
  const from = byKey(fromKey);
  const to = byKey(toKey);
  await signInAs(from);
  // Reuse the request if an earlier run already created it, so the script can be re-run safely.
  const previous = await getDocs(query(collection(db(), "requests"), where("requesterId", "==", uids[fromKey]), where("donorId", "==", uids[toKey])));
  const match = previous.docs.find((item) => item.data().reason === details.reason);
  if (match) {
    const existing = { ...(match.data() as Omit<BloodRequest, "id">), id: match.id } as BloodRequest;
    // Requests from before the public city count existed: give open ones a need so they're counted.
    const needRef = doc(db(), "needs", `seed-${existing.id}`);
    if (!existing.needId && ["pending", "accepted"].includes(existing.status) && !(await getDoc(needRef)).exists()) {
      await openNeed(needRef.id, { requesterId: existing.requesterId, bloodType: existing.bloodType, location: existing.location, urgency: existing.urgency ?? "standard", quantity: existing.quantity, donorIds: [existing.donorId], expiresAt: existing.expiresAt! });
    }
    return existing;
  }
  const request = {
    requesterId: uids[fromKey],
    requesterName: shortName(from.name),
    donorId: uids[toKey],
    donorName: shortName(to.name),
    bloodType: details.bloodType,
    quantity: details.quantity,
    location: from.location ?? to.location ?? "Iloilo City",
    reason: details.reason,
    urgency: details.urgency,
    hospital: details.hospital,
    neededBy: inDays(details.neededIn),
  };
  const id = await createRequest(request);
  // Read it back so later steps see server fields like needId.
  const created = await getDoc(doc(db(), "requests", id));
  return { ...(created.data() as Omit<BloodRequest, "id">), id } as BloodRequest;
}

async function chat(aKey: string, bKey: string, lines: [string, string][]) {
  track(`chat ${aKey} ↔ ${bKey}`);
  const a = byKey(aKey);
  const b = byKey(bKey);
  // Skip if an earlier run already sent the last line.
  await signInAs(a);
  const existing = await getDoc(doc(db(), "conversations", [uids[aKey], uids[bKey]].sort().join("_"))).catch(() => null);
  if (existing?.exists() && existing.data().lastMessage === lines[lines.length - 1][1]) return;
  const conversationId = await (async () => {
    await signInAs(a);
    return openConversation({ uid: uids[aKey], name: shortName(a.name) }, { uid: uids[bKey], name: shortName(b.name) });
  })();
  const conversation: Conversation = { id: conversationId, participants: [uids[aKey], uids[bKey]].sort() as [string, string], names: {}, lastMessage: "", lastSenderId: null, unread: {} };
  for (const [speaker, text] of lines) {
    await signInAs(byKey(speaker));
    await sendMessage(conversation, uids[speaker], text);
  }
}

async function main() {
  for (const person of people) {
    track(`account ${person.key}`);
    await ensureAccount(person);
  }

  // ---- Carl as a seeker (needs O+ for his father's surgery) ----
  await ask("carl", "ana", { bloodType: "O+", urgency: "critical", hospital: "Iloilo Doctors' Hospital", reason: "Father's emergency surgery", quantity: 2, neededIn: 1 });

  const accepted = await ask("carl", "james", { bloodType: "O+", urgency: "urgent", hospital: "Iloilo Doctors' Hospital", reason: "Father's emergency surgery", quantity: 2, neededIn: 2 });
  track("james accepts");
  await signInAs(byKey("james"));
  if (accepted.status === "pending") await acceptAndConnect(accepted);
  await chat("carl", "james", [
    ["carl", "Thank you so much, James! The blood bank is on the 2nd floor."],
    ["james", "No problem. I can be there tomorrow at 2 PM — does that work?"],
    ["carl", "Perfect. I'll meet you at the lobby. Please bring a valid ID."],
    ["james", "See you then 👍"],
  ]);

  const donated = await ask("carl", "paolo", { bloodType: "O+", urgency: "standard", hospital: "Western Visayas Medical Center", reason: "Scheduled operation", quantity: 1, neededIn: 5 });
  track("paolo donates");
  await signInAs(byKey("paolo"));
  if (donated.status === "pending") await acceptAndConnect(donated);
  if (donated.status !== "completed") {
    await completeRequest({ ...donated, status: "accepted" });
    await recordDonation(await profileOf(uids.paolo));
  }
  await chat("carl", "paolo", [["carl", "Thank you for donating, Paolo. My dad is recovering well!"], ["paolo", "So glad to hear that. Wishing him a fast recovery."]]);

  const declined = await ask("carl", "joy", { bloodType: "O+", urgency: "urgent", hospital: "St. Paul's Hospital", reason: "Dengue treatment", quantity: 1, neededIn: 3 });
  track("joy declines");
  await signInAs(byKey("joy"));
  if (declined.status === "pending") await respondToRequest(declined, "declined");

  const cancelled = await ask("carl", "lea", { bloodType: "O+", urgency: "standard", hospital: "St. Paul's Hospital", reason: "Dengue treatment", quantity: 1, neededIn: 4 });
  track("carl cancels");
  await signInAs(byKey("carl"));
  if (cancelled.status === "pending") await cancelRequest(cancelled);

  // ---- Carl as a donor (O+ can give to A+, B+, AB+, O+) ----
  await ask("maria", "carl", { bloodType: "A+", urgency: "critical", hospital: "Iloilo Doctors' Hospital", reason: "Car accident, needs transfusion", quantity: 3, neededIn: 1 });
  await ask("lea", "carl", { bloodType: "B+", urgency: "urgent", hospital: "St. Paul's Hospital", reason: "Childbirth complications", quantity: 1, neededIn: 2 });
  await ask("ana", "carl", { bloodType: "O+", urgency: "standard", hospital: "Western Visayas Medical Center", reason: "Planned knee surgery", quantity: 1, neededIn: 6 });

  // A donation Carl already made (shows in his Donation History).
  const past = await ask("ben", "carl", { bloodType: "AB+", urgency: "urgent", hospital: "Iloilo Mission Hospital", reason: "Anemia treatment", quantity: 1, neededIn: 2 });
  track("carl donates to ben");
  await signInAs(byKey("carl"));
  if (past.status === "pending") await acceptAndConnect(past);
  if (past.status !== "completed") await completeRequest({ ...past, status: "accepted" });
  await chat("carl", "ben", [["ben", "Thanks again for donating, Carl. You're a lifesaver!"]]);
  // Keep Carl eligible to accept new requests in the demo (last donation 80 days ago, 5 total).
  track("carl profile");
  await signInAs(byKey("carl"));
  await updateUserProfile(await profileOf(uids.carl), { lastDonation: daysAgo(80), totalDonations: 5 });

  // ---- End-to-end journey: Tess (seeker) ↔ Dan (donor) ----
  // 1. Tess asks Dan → Dan accepts → they set an appointment in chat → Dan donates → thank-you.
  const journey = await ask("tess", "dan", { bloodType: "A+", urgency: "critical", hospital: "Iloilo Doctors' Hospital", reason: "Mother's heart surgery", quantity: 1, neededIn: 1 });
  track("dan accepts and donates");
  await signInAs(byKey("dan"));
  if (journey.status === "pending") await acceptAndConnect(journey);
  if (journey.status !== "completed") {
    await completeRequest({ ...journey, status: "accepted" });
    await recordDonation(await profileOf(uids.dan));
  }
  await chat("tess", "dan", [
    ["tess", "Thank you so much, Dan! Mom's surgery is tomorrow morning."],
    ["dan", "Happy to help. When should I come in?"],
    ["tess", "Could you make it tomorrow at 8:00 AM? The blood bank is on the 2nd floor of Iloilo Doctors'."],
    ["dan", "8:00 AM works. I'll bring my ID and donor card."],
    ["tess", "See you there. I'll wait at the main lobby. 🙏"],
    ["dan", "Done! Just finished donating. Hope your mom's surgery goes well."],
    ["tess", "We're so grateful. The surgery went well — thank you, Dan!"],
  ]);

  // 2. Accepted, appointment set, not yet donated: Tess asks Paolo, he accepts and they agree on a time.
  const upcoming = await ask("tess", "paolo", { bloodType: "A+", urgency: "urgent", hospital: "Iloilo Doctors' Hospital", reason: "Mother's recovery (extra unit)", quantity: 1, neededIn: 3 });
  track("paolo accepts (appointment set)");
  await signInAs(byKey("paolo"));
  if (upcoming.status === "pending") await acceptAndConnect(upcoming);
  await chat("tess", "paolo", [
    ["tess", "Thank you, Paolo! Are you free on Thursday?"],
    ["paolo", "Thursday at 2:00 PM works for me."],
    ["tess", "Great — Thursday, 2:00 PM at Iloilo Doctors' blood bank, 2nd floor. See you!"],
  ]);

  // 3. Pending SENT: Tess is still waiting on Maria.
  await ask("tess", "maria", { bloodType: "A+", urgency: "standard", hospital: "Iloilo Doctors' Hospital", reason: "Backup unit for mother's recovery", quantity: 1, neededIn: 6 });

  // 4. Pending RECEIVED: Ben asks Tess (she can answer); James asks Dan (Dan just donated, so he'll see the waiting period).
  await ask("ben", "tess", { bloodType: "AB+", urgency: "urgent", hospital: "Iloilo Mission Hospital", reason: "Platelet support after chemo", quantity: 1, neededIn: 3 });
  await ask("james", "dan", { bloodType: "O-", urgency: "standard", hospital: "Western Visayas Medical Center", reason: "Scheduled hip replacement", quantity: 1, neededIn: 7 });

  console.log("\nDemo activity created.");
}

main()
  .then(async () => {
    await signOut(firebaseAuth()).catch(() => {});
    console.log(`\nSign in with any of these (password: ${password}):`);
    for (const person of people) console.log(`  ${person.email.padEnd(28)} ${person.name}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Seeding failed at "${step}":`, error.code ?? "", error.message);
    process.exit(1);
  });
