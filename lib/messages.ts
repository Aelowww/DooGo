import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type Conversation = {
  id: string;
  participants: [string, string];
  names: Record<string, string>;
  lastMessage: string;
  lastSenderId: string | null;
  unread: Record<string, number>;
  updatedAt?: Timestamp;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  text: string;
  createdAt?: Timestamp;
};

function toConversation(id: string, data: Partial<Omit<Conversation, "id">>): Conversation {
  return {
    id,
    participants: data.participants ?? ["", ""],
    names: data.names ?? {},
    lastMessage: data.lastMessage ?? "",
    lastSenderId: data.lastSenderId ?? null,
    unread: data.unread ?? {},
    updatedAt: data.updatedAt,
  };
}

export function conversationId(a: string, b: string) {
  return [a, b].sort().join("_");
}

export function otherParticipant(conversation: Pick<Conversation, "participants">, uid: string) {
  return conversation.participants.find((participant) => participant !== uid) ?? uid;
}

/** Creates the conversation if needed (or refreshes names) and returns its id. Never reads first, so it works before the doc exists. */
export async function openConversation(me: { uid: string; name: string }, other: { uid: string; name: string }) {
  const id = conversationId(me.uid, other.uid);
  await setDoc(
    doc(db(), "conversations", id),
    {
      participants: [me.uid, other.uid].sort(),
      names: { [me.uid]: me.name, [other.uid]: other.name },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return id;
}

export function subscribeConversations(uid: string, onChange: (items: Conversation[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db(), "conversations"), where("participants", "array-contains", uid)),
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => toConversation(item.id, item.data()))
        .filter((conversation) => conversation.lastMessage)
        .sort((a, b) => (b.updatedAt?.toMillis() ?? Date.now()) - (a.updatedAt?.toMillis() ?? Date.now())),
    ),
    onError,
  );
}

export function subscribeConversation(id: string, onChange: (conversation: Conversation | null) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    doc(db(), "conversations", id),
    (snapshot) => onChange(snapshot.exists() ? toConversation(snapshot.id, snapshot.data()) : null),
    onError,
  );
}

export function subscribeMessages(conversation: string, onChange: (messages: ChatMessage[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db(), "conversations", conversation, "messages"), orderBy("createdAt", "asc")),
    (snapshot) => onChange(snapshot.docs.map((item) => ({ ...(item.data() as Omit<ChatMessage, "id">), id: item.id }))),
    onError,
  );
}

export async function sendMessage(conversation: Conversation, senderId: string, text: string) {
  const body = text.trim();
  if (!body) return;
  const recipient = otherParticipant(conversation, senderId);
  await addDoc(collection(db(), "conversations", conversation.id, "messages"), { senderId, text: body, createdAt: serverTimestamp() });
  await updateDoc(doc(db(), "conversations", conversation.id), {
    lastMessage: body,
    lastSenderId: senderId,
    updatedAt: serverTimestamp(),
    [`unread.${recipient}`]: increment(1),
  });
}

export async function markConversationRead(conversation: Conversation, uid: string) {
  if (!conversation.unread?.[uid]) return;
  await updateDoc(doc(db(), "conversations", conversation.id), { [`unread.${uid}`]: 0 });
}
