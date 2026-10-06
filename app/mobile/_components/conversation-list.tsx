"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChatsCircle, Drop, FileText, HandHeart, MagnifyingGlass } from "@phosphor-icons/react";
import { chatStamp } from "@/lib/format";
import { otherParticipant, subscribeConversations, type Conversation } from "@/lib/messages";
import { useSession } from "./session";
import { EngageEmpty } from "./engage-empty";
import { InitialsAvatar, ListSkeleton, cx, uiStyles } from "./ui";
import styles from "./conversation-list.module.css";

/** Inbox list, used by the Messages tab and the desktop chat sidebar. */
export function ConversationList({ activeId, compact = false }: { activeId?: string; compact?: boolean }) {
  const { user } = useSession();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => subscribeConversations(user.uid, setConversations, () => setConversations([])), [user.uid]);

  if (conversations === null) return <ListSkeleton />;
  if (conversations.length === 0) {
    return (
      <EngageEmpty
        compact={compact}
        icon={ChatsCircle}
        orbit={[Drop, HandHeart]}
        eyebrow="No conversations yet"
        title="Your conversations start here"
        body="When a donor accepts your request, or you accept someone's, a chat opens here so you can agree on a time and place."
        primary={{ label: "Find a donor", href: "/request-blood", icon: MagnifyingGlass }}
        secondary={{ label: "My requests", href: "/requests", icon: FileText }}
        steps={[
          { title: "Confirm the hospital", body: "Share the exact blood bank or ward to go to." },
          { title: "Agree on a time", body: "Donors may need a few hours to get there." },
          { title: "Mark as donated", body: "Donors confirm afterwards to update their history." },
        ]}
      />
    );
  }

  return (
    <div className={styles.list}>
      {conversations.map((conversation) => {
        const other = otherParticipant(conversation, user.uid);
        const name = conversation.names?.[other] || "DooGo user";
        const unread = conversation.id !== activeId && (conversation.unread?.[user.uid] ?? 0) > 0;
        return (
          <Link
            key={conversation.id}
            href={`/messages/${conversation.id}`}
            className={cx(uiStyles.card, styles.item, unread && styles.unread, conversation.id === activeId && styles.active)}
            aria-current={conversation.id === activeId ? "page" : undefined}
          >
            <InitialsAvatar name={name} size={48} unread={unread} />
            <span className={styles.text}>
              <span className={styles.top}>
                <strong>{name}</strong>
                <time>{chatStamp(conversation.updatedAt)}</time>
              </span>
              <span className={styles.preview}>
                {conversation.lastSenderId === user.uid ? "You: " : ""}{conversation.lastMessage}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
