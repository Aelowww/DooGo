"use client";

import { ChatsCircle } from "@phosphor-icons/react";
import { ConversationList } from "@/app/mobile/_components/conversation-list";
import { useLayout } from "@/app/mobile/_components/contexts";
import { IconWell, Screen, TopBar } from "@/app/mobile/_components/ui";
import styles from "@/app/mobile/_components/chat-layout.module.css";

export default function MessagesPage() {
  const layout = useLayout();

  if (layout === "desktop") {
    return (
      <Screen bare className={styles.split}>
        <aside className={styles.inbox}>
          <h1>Messages</h1>
          <ConversationList compact />
        </aside>
        <section className={styles.placeholder}>
          <IconWell icon={ChatsCircle} size={64} />
          <strong>Select a conversation</strong>
          <p>Chats open once a blood request is accepted.</p>
        </section>
      </Screen>
    );
  }

  return (
    <Screen nav="messages" topBar={<TopBar title="Messages" back={false} />}>
      <ConversationList />
    </Screen>
  );
}
