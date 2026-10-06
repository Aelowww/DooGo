"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { Alert, AuthInput, BackButton, Button, Heading, Screen, uiStyles } from "@/app/mobile/_components/ui";
import { firebaseAuth } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/format";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim());
      router.push("/password-reset");
    } catch (caught) {
      const code = (caught as { code?: string }).code;
      // Don't reveal whether an account exists for this email.
      if (code === "auth/user-not-found") router.push("/password-reset");
      else {
        setError(friendlyAuthError(caught));
        setSubmitting(false);
      }
    }
  }

  return (
    <Screen onSubmit={submit} footer={<Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send Reset Link"}</Button>}>
      <BackButton href="/sign-in" />
      <Heading title="Forgot Password" />
      <p className={uiStyles.body}>Enter your email to reset your password. We will send you a secured link to create a new password.</p>
      <div className={uiStyles.form}>
        {error && <Alert>{error}</Alert>}
        <AuthInput
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Email Address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={Boolean(error)}
        />
      </div>
    </Screen>
  );
}
