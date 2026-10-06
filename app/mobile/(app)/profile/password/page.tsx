"use client";

import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { PasswordChecklist } from "@/app/mobile/_components/password-checklist";
import { useSession } from "@/app/mobile/_components/session";
import { useToast } from "@/app/_components/toast";
import { Alert, BackButton, Button, Field, Heading, Screen, TextControl, cx, uiStyles } from "@/app/mobile/_components/ui";
import { friendlyAuthError } from "@/lib/format";
import { passwordProblem } from "@/lib/password";

const empty = { current: "", next: "", confirm: "" };

export default function ChangePasswordPage() {
  const { user, profile } = useSession();
  const [form, setForm] = useState(empty);
  const [status, setStatus] = useState<{ type: "saved" | "error"; text: string } | null>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.current) return setStatus({ type: "error", text: "Enter your current password." });
    const weak = passwordProblem(form.next, { name: profile.fullName, email: profile.email });
    if (weak) return setStatus({ type: "error", text: weak });
    if (form.next !== form.confirm) return setStatus({ type: "error", text: "New passwords do not match." });
    if (form.next === form.current) return setStatus({ type: "error", text: "Choose a password you haven't used here." });
    setSaving(true);
    setStatus(null);
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? "", form.current));
      await updatePassword(user, form.next);
      setForm(empty);
      setStatus(null);
      toast("Changes saved", { body: "Your password has been updated." });
    } catch (caught) {
      const code = (caught as { code?: string }).code;
      setStatus({
        type: "error",
        text: code === "auth/invalid-credential" || code === "auth/wrong-password" ? "Your current password is incorrect." : friendlyAuthError(caught),
      });
    } finally {
      setSaving(false);
    }
  }

  const field = (key: keyof typeof empty, label: string, autoComplete: string) => (
    <Field label={label}>
      <TextControl
        variant="plain"
        type="password"
        placeholder="••••••••"
        autoComplete={autoComplete}
        value={form[key]}
        onChange={(event) => setForm({ ...form, [key]: event.target.value })}
      />
    </Field>
  );

  return (
    <Screen onSubmit={submit} gap={16} footer={<Button type="submit" size="compact" disabled={saving}>{saving ? "Updating…" : "Update Password"}</Button>}>
      <BackButton href="/profile" />
      <Heading title="Change Password" />
      <div className={cx(uiStyles.form, uiStyles.formLoose)}>
        {status?.type === "error" && <Alert>{status.text}</Alert>}
        {field("current", "Current Password", "current-password")}
        {field("next", "New Password", "new-password")}
        {form.next && <PasswordChecklist password={form.next} name={profile.fullName} email={profile.email} />}
        {field("confirm", "Confirm New Password", "new-password")}
      </div>
    </Screen>
  );
}
