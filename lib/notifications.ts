import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export type NotificationType = "request" | "accepted" | "declined" | "completed" | "status" | "reminder" | "message";

export type AppNotification = {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  title: string;
  link: string | null;
  read: boolean;
  createdAt?: Timestamp;
};

const notificationsCollection = () => collection(db(), "notifications");

export async function notify(notification: Omit<AppNotification, "id" | "read" | "createdAt" | "link"> & { link?: string | null }) {
  await addDoc(notificationsCollection(), { link: null, ...notification, read: false, createdAt: serverTimestamp() });
}

export function subscribeNotifications(uid: string, onChange: (items: AppNotification[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(notificationsCollection(), where("userId", "==", uid)),
    (snapshot) => onChange(
      snapshot.docs
        .map((item) => ({ ...(item.data() as Omit<AppNotification, "id">), id: item.id }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? Date.now()) - (a.createdAt?.toMillis() ?? Date.now())),
    ),
    onError,
  );
}

export function subscribeHasUnread(uid: string, onChange: (hasUnread: boolean) => void) {
  return onSnapshot(
    query(notificationsCollection(), where("userId", "==", uid), where("read", "==", false)),
    (snapshot) => onChange(!snapshot.empty),
    () => onChange(false),
  );
}

export function subscribeUnreadCount(uid: string, onChange: (count: number) => void) {
  return onSnapshot(
    query(notificationsCollection(), where("userId", "==", uid), where("read", "==", false)),
    (snapshot) => onChange(snapshot.size),
    () => onChange(0),
  );
}

export async function markRead(id: string) {
  await updateDoc(doc(db(), "notifications", id), { read: true });
}

export async function markAllRead(items: AppNotification[]) {
  const unread = items.filter((item) => !item.read);
  if (unread.length === 0) return;
  const batch = writeBatch(db());
  unread.forEach((item) => batch.update(doc(db(), "notifications", item.id), { read: true }));
  await batch.commit();
}
