"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, ButtonLink, Field, Heading, Screen, TextControl } from "@/app/mobile/_components/ui";
import { friendlyAuthError } from "@/lib/format";
import { deleteUserData } from "@/lib/users";
import styles from "./page.module.css";

/** Firebase only allows deleting an account shortly after signing in. */
function signedInRecently(lastSignInTime: string | undefined) {
  return Boolean(lastSignInTime && Date.now() - Date.parse(lastSignInTime) < 4 * 60_000);
}

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user } = useSession();
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setError("");
    if (!needsPassword && !signedInRecently(user.metadata.lastSignInTime)) {
      setNeedsPassword(true);
      return;
    }
    if (needsPassword && !password) {
      setError("Enter your password to confirm.");
      return;
    }
    setDeleting(true);
    try {
      // Confirm identity first so we never delete the data but leave the login behind.
      if (needsPassword) await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", password));
      await deleteUserData(user.uid);
      await deleteUser(user);
      router.replace("/splash");
    } catch (caught) {
      const code = (caught as { code?: string }).code;
      setError(code === "auth/invalid-credential" || code === "auth/wrong-password" ? "That password is incorrect." : friendlyAuthError(caught));
      setDeleting(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button variant="tinted" size="compact" onClick={remove} disabled={deleting}>{deleting ? "Deleting…" : "Delete My Account"}</Button>
          <ButtonLink href="/profile/account" size="compact">Cancel</ButtonLink>
        </>
      }
    >
      <BackButton href="/profile/privacy" />
      <Heading title="Delete Account" />
      <section className={styles.warning}>
        <span className={styles.mark} aria-hidden="true">!</span>
        <h2>Are you sure?</h2>
        <p>This action cannot be undone. All your data, donation history, and account information will be permanently deleted.</p>
      </section>
      {needsPassword && (
        <Field label="Confirm your password">
          <TextControl variant="plain" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus />
        </Field>
      )}
      {error && <Alert>{error}</Alert>}
    </Screen>
  );
}
