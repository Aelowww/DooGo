"use client";

import { ArrowsClockwise, Bell, ChatCircleDots, CheckCircle, Drop, XCircle, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "@/app/mobile/_components/session";
import { EmptyState, IconWell, ListSkeleton, Screen, TopBar, cx, uiStyles } from "@/app/mobile/_components/ui";
import { timeAgo } from "@/lib/format";
import { safeInternalPath } from "@/lib/layout";
import { markAllRead, subscribeNotifications, type AppNotification, type NotificationType } from "@/lib/notifications";
import styles from "./page.module.css";

const icons: Record<NotificationType, PhosphorIcon> = {
  accepted: CheckCircle,
  completed: CheckCircle,
  request: Drop,
  status: ArrowsClockwise,
  declined: XCircle,
  reminder: Bell,
  message: ChatCircleDots,
};

export default function NotificationsPage() {
  const { user, profile } = useSession();
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const latestRef = useRef<AppNotification[] | null>(null);
  const loaded = items !== null;

  useEffect(() => subscribeNotifications(user.uid, setItems, () => setItems([])), [user.uid]);

  useEffect(() => {
    latestRef.current = items;
  }, [items]);

  // Opening the list counts as reading it (clears the dot on the Home bell).
  // Wait a moment so new items stay highlighted long enough to notice.
  useEffect(() => {
    if (!loaded) return;
    const timer = window.setTimeout(() => {
      if (latestRef.current) markAllRead(latestRef.current).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [loaded]);

  const needsSetup = !profile.bloodType || !profile.location;

  return (
    <Screen nav="home" topBar={<TopBar title="Notifications" backHref="/home" />} gap={12}>
      {needsSetup && (
        <NotificationCard
          href="/donate/setup"
          icon={icons.reminder}
          title="Reminder: Update your availability info"
          meta="Complete your donor details so seekers can find you"
        />
      )}
      {items === null
        ? <ListSkeleton />
        : items.length === 0 && !needsSetup
          ? <EmptyState title="No notifications yet" description="Updates about your requests and donations will show up here." />
          : items.map((item) => (
            <NotificationCard key={item.id} href={safeInternalPath(item.link)} icon={icons[item.type] ?? icons.reminder} title={item.title} meta={timeAgo(item.createdAt)} unread={!item.read} />
          ))}
    </Screen>
  );
}

function NotificationCard({ href, icon, title, meta, unread = false }: { href?: string | null; icon: PhosphorIcon; title: string; meta: string; unread?: boolean }) {
  const body = (
    <>
      <IconWell icon={icon} size={40} round tone={unread ? "solid" : "tinted"} />
      <span className={styles.text}>
        <strong>{title}</strong>
        <span>{meta}</span>
      </span>
      {unread && <i className={styles.dot} aria-label="Unread" />}
    </>
  );
  return href
    ? <Link href={href} className={cx(uiStyles.card, styles.item, unread && styles.unread)}>{body}</Link>
    : <div className={cx(uiStyles.card, styles.item, unread && styles.unread)}>{body}</div>;
}
