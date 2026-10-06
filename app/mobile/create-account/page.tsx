"use client";

import { Check, EnvelopeSimple, LockKey, User } from "@phosphor-icons/react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, signOut, updateProfile } from "firebase/auth";
import { PasswordChecklist } from "@/app/mobile/_components/password-checklist";
import { SplashLogo } from "@/app/mobile/_components/splash-logo";
import { Alert, AuthInput, Button, Heading, Screen, uiStyles } from "@/app/mobile/_components/ui";
import { firebaseAuth } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/format";
import { passwordProblem } from "@/lib/password";
import { createUserProfile } from "@/lib/users";
import styles from "./page.module.css";

export default function CreateAccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  function validate() {
    if (!form.fullName.trim()) return "Enter your full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter a valid email address.";
    const weak = passwordProblem(form.password, { name: form.fullName, email: form.email });
    if (weak) return weak;
    if (form.password !== form.confirm) return "Passwords do not match.";
    if (!agreed) return "Please agree to the Terms and Privacy Policy.";
    return "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;
    setSubmitting(true);
    try {
      const auth = firebaseAuth();
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      await updateProfile(user, { displayName: form.fullName.trim() });
      await createUserProfile(user.uid, form.fullName.trim(), form.email.trim());
      // Firebase signs new accounts in automatically; sign out so they log in themselves,
      // then land on Sign In with their email filled in. Profile setup follows that sign-in.
      await signOut(auth);
      router.replace(`/sign-in?created=1&email=${encodeURIComponent(form.email.trim())}`);
    } catch (caught) {
      setError(friendlyAuthError(caught));
      setSubmitting(false);
    }
  }

  return (
    <Screen
      onSubmit={submit}
      className={styles.content}
      footer={
        <>
          <Button type="submit" disabled={submitting}>{submitting ? "Creating Account…" : "Create Account"}</Button>
          <p className={uiStyles.altAction}>Already have an account? <Link href="/sign-in">Sign in</Link></p>
        </>
      }
    >
      <div className={styles.brand}>
        <SplashLogo animate={false} className={styles.logo} />
      </div>
      <Heading title="Create Account" />
      <div className={uiStyles.form}>
        {error && <Alert>{error}</Alert>}
        <AuthInput icon={User} placeholder="Full Name" autoComplete="name" value={form.fullName} onChange={update("fullName")} required />
        <AuthInput icon={EnvelopeSimple} type="email" inputMode="email" placeholder="Email" autoComplete="email" value={form.email} onChange={update("email")} required />
        <AuthInput icon={LockKey} type="password" placeholder="Password" autoComplete="new-password" value={form.password} onChange={update("password")} required />
        {form.password && <PasswordChecklist password={form.password} name={form.fullName} email={form.email} />}
        <AuthInput icon={LockKey} type="password" placeholder="Confirm Password" autoComplete="new-password" value={form.confirm} onChange={update("confirm")} required />
        <label className={uiStyles.checkbox}>
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <i className={agreed ? uiStyles.checkboxOn : undefined}>{agreed && <Check size={14} />}</i>
          <span>I agree to the <Link href="/terms"><strong>Terms</strong></Link> and <Link href="/privacy-policy">Privacy Policy</Link></span>
        </label>
      </div>
    </Screen>
  );
}
