"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { subscribeConversations } from "@/lib/messages";
import { subscribeUnreadCount } from "@/lib/notifications";
import { subscribeRequests } from "@/lib/requests";

export type Badges = {
  /** Received requests still waiting for this donor's answer. */
  requests: number;
  /** Conversations with unread messages. */
  messages: number;
  /** Unread notifications. */
  notifications: number;
};

const empty: Badges = { requests: 0, messages: 0, notifications: 0 };

const BadgeContext = createContext<Badges>(empty);

export function BadgeProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const [badges, setBadges] = useState<Badges>(empty);

  useEffect(() => {
    const stopRequests = subscribeRequests(
      "donorId",
      uid,
      (items) => setBadges((current) => ({ ...current, requests: items.filter((item) => item.status === "pending").length })),
      () => {},
    );
    const stopMessages = subscribeConversations(
      uid,
      (items) => setBadges((current) => ({ ...current, messages: items.filter((item) => (item.unread?.[uid] ?? 0) > 0).length })),
      () => {},
    );
    const stopNotifications = subscribeUnreadCount(uid, (notifications) => setBadges((current) => ({ ...current, notifications })));
    return () => {
      stopRequests();
      stopMessages();
      stopNotifications();
    };
  }, [uid]);

  return <BadgeContext.Provider value={badges}>{children}</BadgeContext.Provider>;
}

export function useBadges() {
  return useContext(BadgeContext);
}
