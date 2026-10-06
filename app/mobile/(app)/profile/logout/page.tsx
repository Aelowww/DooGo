"use client";

import { SignOut } from "@phosphor-icons/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { BackButton, Button, ButtonLink, Heading, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import { firebaseAuth } from "@/lib/firebase/client";
import styles from "./page.module.css";

export default function LogoutPage() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logOut() {
    setLeaving(true);
    await signOut(firebaseAuth());
    router.replace("/sign-in");
  }

  return (
    <Screen
      gap={16}
      footer={
        <>
          <Button variant="tinted" size="compact" onClick={logOut} disabled={leaving}>{leaving ? "Logging Out…" : "Log Out"}</Button>
          <ButtonLink href="/profile/account" size="compact">Cancel</ButtonLink>
        </>
      }
    >
      <BackButton href="/profile/account" />
      <Heading title="Log Out" />
      <section className={styles.body}>
        <span className={cx(uiStyles.cardTinted, styles.icon)}>
          <SignOut size={40} />
        </span>
        <p>Are you sure you want to log out?</p>
      </section>
    </Screen>
  );
}
