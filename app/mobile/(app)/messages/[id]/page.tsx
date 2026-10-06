"use client";

import { ArrowLeft, PaperPlaneRight } from "@phosphor-icons/react";
import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLayout } from "@/app/mobile/_components/contexts";
import { ConversationList } from "@/app/mobile/_components/conversation-list";
import { useSession } from "@/app/mobile/_components/session";
import { EmptyState, InitialsAvatar, ListSkeleton, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import { formatTime, timeAgo } from "@/lib/format";
import {
  markConversationRead,
  otherParticipant,
  sendMessage,
  subscribeConversation,
  subscribeMessages,
  type ChatMessage,
  type Conversation,
} from "@/lib/messages";
import { isActiveNow, subscribeDonor, type DonorProfile } from "@/lib/users";
import layoutStyles from "@/app/mobile/_components/chat-layout.module.css";
import styles from "./page.module.css";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const layout = useLayout();

  if (layout === "desktop") {
    return (
      <Screen bare className={layoutStyles.split}>
        <aside className={layoutStyles.inbox}>
          <h1>Messages</h1>
          <ConversationList activeId={id} compact />
        </aside>
        <section className={cx(layoutStyles.pane, styles.desktopChat)}>
          <Chat id={id} />
        </section>
      </Screen>
    );
  }

  return (
    <Screen bare className={styles.chat}>
      <Chat id={id} />
    </Screen>
  );
}

function Chat({ id }: { id: string }) {
  const { user } = useSession();
  const [conversation, setConversation] = useState<Conversation | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [other, setOther] = useState<DonorProfile | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLElement>(null);

  useEffect(() => subscribeConversation(id, setConversation, () => setConversation(null)), [id]);
  useEffect(() => subscribeMessages(id, setMessages, () => setMessages([])), [id]);

  const otherId = conversation ? otherParticipant(conversation, user.uid) : null;
  useEffect(() => (otherId ? subscribeDonor(otherId, setOther) : undefined), [otherId]);

  useEffect(() => {
    if (conversation) markConversationRead(conversation, user.uid).catch(() => {});
  }, [conversation, user.uid]);

  // Keep the newest message in view without scrolling the whole page.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages.length]);

  if (conversation === undefined) return <div className={styles.loading}><ListSkeleton count={4} /></div>;
  if (conversation === null || !otherId) {
    return (
      <div className={styles.loading}>
        <EmptyState title="Conversation not found" action={<Link className={uiStyles.textLink} href="/messages">Back to Messages</Link>} />
      </div>
    );
  }

  const name = conversation.names?.[otherId] || other?.name || "DooGo user";
  const active = isActiveNow(other?.lastActiveAt);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!conversation || !draft.trim() || sending) return;
    const text = draft;
    setDraft("");
    setSending(true);
    try {
      await sendMessage(conversation, user.uid, text);
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <header className={styles.header}>
        <Link href="/messages" className={styles.back} aria-label="Back to messages">
          <ArrowLeft weight="bold" size={22} />
        </Link>
        <InitialsAvatar name={name} size={36} />
        <span className={styles.who}>
          <strong>{name}</strong>
          <span className={active ? styles.active : undefined}>
            {active ? "Active Now" : other?.lastActiveAt ? `Active ${timeAgo(other.lastActiveAt).toLowerCase()}` : "Offline"}
          </span>
        </span>
      </header>

      <section ref={threadRef} className={styles.thread} aria-live="polite">
        {messages.length === 0 && <p className={styles.hint}>Say hello to {name} and agree on a time and place to donate.</p>}
        {messages.map((message) => {
          const mine = message.senderId === user.uid;
          return (
            <div key={message.id} className={cx(styles.row, mine && styles.rowMine)}>
              <div className={cx(styles.bubble, mine ? styles.mine : styles.theirs)}>
                <p>{message.text}</p>
                <time>{formatTime(message.createdAt) || "Sending…"}</time>
              </div>
            </div>
          );
        })}
      </section>

      <form className={styles.composer} onSubmit={submit}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message..."
          aria-label="Message"
          maxLength={1000}
          enterKeyHint="send"
        />
        <button type="submit" aria-label="Send message" disabled={!draft.trim() || sending}>
          <PaperPlaneRight size={18} />
        </button>
      </form>
    </>
  );
}
