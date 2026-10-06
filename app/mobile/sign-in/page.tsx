"use client";

import { EnvelopeSimple, LockKey } from "@phosphor-icons/react";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth } from "@/app/_components/auth-provider";
import { Alert, AuthInput, BackButton, Button, Heading, Notice, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import { firebaseAuth } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/format";
import { safeInternalPath } from "@/lib/layout";
import styles from "./page.module.css";

/** Where to go after signing in — only same-site paths from ?next=. */
function nextPath() {
  return safeInternalPath(new URLSearchParams(window.location.search).get("next")) ?? "/home";
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  // Arriving straight from Create Account: show a welcome and fill in the new email.
  const justCreated = params.get("created") === "1";
  const { user, loading } = useAuth();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(nextPath());
  }, [loading, user, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
      router.replace(nextPath());
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setSubmitting(false);
    }
  }

  return (
    <Screen
      onSubmit={submit}
      footer={
        <>
          <Button type="submit" disabled={submitting}>{submitting ? "Signing In…" : "Sign In"}</Button>
          <p className={uiStyles.altAction}>Don&apos;t have an account? <Link href="/create-account">Sign Up</Link></p>
        </>
      }
    >
      <BackButton href="/splash" />
      <Heading title="Sign In" />
      <div className={uiStyles.form}>
        {justCreated && !error && <Notice>Your account has been created. Sign in to set up your profile.</Notice>}
        {error && <Alert>{error}</Alert>}
        <AuthInput
          icon={EnvelopeSimple}
          type="email"
          placeholder="Email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={Boolean(error)}
          required
        />
        <AuthInput
          icon={LockKey}
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={Boolean(error)}
          required
        />
        <Link className={cx(uiStyles.textLink, styles.forgot)} href="/forgot-password">Forgot Password?</Link>
      </div>
    </Screen>
  );
}
