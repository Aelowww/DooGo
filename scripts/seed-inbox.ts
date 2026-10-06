/**
 * Fills a real account's inbox with activity from the demo users: received blood
 * requests and chats. Run seed-demo.ts first so the demo accounts exist.
 *
 *   npx tsx --env-file=.env.local scripts/seed-inbox.ts <uid>
 *
 * Only things other people can do are seeded (Firestore rules let each user write only as
 * themselves), so sent requests and accepting/donating still have to be done in the app.
 * Safe to re-run: existing requests and chats are reused.
 */
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { BloodType, Urgency } from "@/lib/blood";
import { db, firebaseAuth } from "@/lib/firebase/client";
import { todayISO } from "@/lib/format";
import { openConversation, sendMessage, type Conversation } from "@/lib/messages";
import { createRequest } from "@/lib/requests";

const password = "DooGo1234!";
const targetUid = process.argv[2];

const demo = {
  maria: { email: "maria.santos@doogo.test", name: "Maria S." },
  ben: { email: "ben.torres@doogo.test", name: "Ben T." },
  lea: { email: "lea.mendoza@doogo.test", name: "Lea M." },
  james: { email: "james.reyes@doogo.test", name: "James R." },
  tess: { email: "tess.seeker@doogo.test", name: "Tess V." },
  ana: { email: "ana.cruz@doogo.test", name: "Ana C." },
} as const;
type DemoKey = keyof typeof demo;

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

async function signInAs(key: DemoKey) {
  await signOut(firebaseAuth()).catch(() => {});
  const { user } = await signInWithEmailAndPassword(firebaseAuth(), demo[key].email, password);
  return user.uid;
}

async function ask(from: DemoKey, target: { uid: string; name: string; location: string }, details: { bloodType: BloodType; urgency: Urgency; hospital: string; reason: string; quantity: number; neededIn: number }) {
  console.log(`… ${from} asks you for ${details.bloodType} (${details.urgency})`);
  const uid = await signInAs(from);
  const previous = await getDocs(query(collection(db(), "requests"), where("requesterId", "==", uid), where("donorId", "==", target.uid)));
  if (previous.docs.some((item) => item.data().reason === details.reason)) return;
  await createRequest({
    requesterId: uid,
    requesterName: demo[from].name,
    donorId: target.uid,
    donorName: target.name,
    bloodType: details.bloodType,
    quantity: details.quantity,
    location: target.location,
    reason: details.reason,
    urgency: details.urgency,
    hospital: details.hospital,
    neededBy: inDays(details.neededIn),
  });
}

async function chat(from: DemoKey, target: { uid: string; name: string }, lines: string[]) {
  console.log(`… chat with ${from}`);
  const uid = await signInAs(from);
  const id = [uid, target.uid].sort().join("_");
  const existing = await getDoc(doc(db(), "conversations", id)).catch(() => null);
  if (existing?.exists() && existing.data().lastMessage === lines[lines.length - 1]) return;
  await openConversation({ uid, name: demo[from].name }, { uid: target.uid, name: target.name });
  const conversation: Conversation = { id, participants: [uid, target.uid].sort() as [string, string], names: {}, lastMessage: "", lastSenderId: null, unread: {} };
  for (const text of lines) await sendMessage(conversation, uid, text);
}

async function main() {
  if (!targetUid) throw new Error("Pass the account's uid: scripts/seed-inbox.ts <uid>");
  await signInAs("james");
  const card = await getDoc(doc(db(), "donors", targetUid));
  if (!card.exists()) throw new Error(`No account with uid ${targetUid}`);
  const target = { uid: targetUid, name: (card.data().name as string) || "Donor", location: (card.data().location as string) || "Iloilo City" };
  console.log(`Seeding inbox for ${target.name} (${target.location})`);

  // Received requests in every urgency, waiting for an answer.
  await ask("maria", target, { bloodType: "AB+", urgency: "critical", hospital: "Iloilo Doctors' Hospital", reason: "Emergency C-section, heavy blood loss", quantity: 2, neededIn: 1 });
  await ask("ben", target, { bloodType: "AB+", urgency: "urgent", hospital: "Iloilo Mission Hospital", reason: "Platelet support after chemo", quantity: 1, neededIn: 3 });
  await ask("lea", target, { bloodType: "AB-", urgency: "standard", hospital: "St. Paul's Hospital", reason: "Scheduled gallbladder surgery", quantity: 1, neededIn: 7 });

  // Chats waiting on a reply.
  await chat("james", target, [
    "Hi! I saw you're an AB- donor here in Iloilo City.",
    "My cousin might need AB- next week at Western Visayas Medical Center. Would you be open to donating if it comes to that?",
  ]);
  await chat("tess", target, [
    "Hello! I'm coordinating donors for my mom's surgery at Iloilo Doctors'.",
    "We're covered for now, but could I message you if we need a backup unit?",
  ]);
  await chat("ana", target, [
    "Hi! First-time donor here 😊 Any tips before my first donation on Saturday?",
  ]);

  console.log("\nDone. Open the app as that account to see the requests and chats.");
}

main()
  .then(async () => {
    await signOut(firebaseAuth()).catch(() => {});
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error.code ?? "", error.message);
    process.exit(1);
  });
