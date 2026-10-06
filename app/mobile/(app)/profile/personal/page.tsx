"use client";

import { useState } from "react";
import { useSession } from "@/app/mobile/_components/session";
import { useToast } from "@/app/_components/toast";
import { Alert, Button, Field, Screen, SelectControl, TextControl, TopBar, uiStyles } from "@/app/mobile/_components/ui";
import { todayISO } from "@/lib/format";
import { updateUserProfile } from "@/lib/users";

const genders = ["Male", "Female", "Other", "Prefer not to say"];

export default function PersonalInformationPage() {
  const { profile } = useSession();
  const [form, setForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
  });
  const [status, setStatus] = useState<{ type: "saved" | "error"; text: string } | null>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.fullName.trim()) return setStatus({ type: "error", text: "Enter your full name." });
    if (form.phone && !/^\+?[\d\s()-]{7,20}$/.test(form.phone)) return setStatus({ type: "error", text: "Enter a valid phone number." });
    setSaving(true);
    setStatus(null);
    try {
      await updateUserProfile(profile, { ...form, fullName: form.fullName.trim(), phone: form.phone.trim() });
      setStatus(null);
      toast("Changes saved", { body: "Your personal information has been updated." });
    } catch {
      setStatus({ type: "error", text: "We couldn't save your changes. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      onSubmit={submit}
      topBar={<TopBar title="Personal Information" backHref="/profile" />}
      footer={<Button type="submit" size="compact" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>}
    >
      <div className={uiStyles.form} style={{ paddingTop: 24 }}>
        {status?.type === "error" && <Alert>{status.text}</Alert>}
        <Field label="Full Name">
          <TextControl variant="tinted" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        </Field>
        <Field label="Email Address">
          <TextControl variant="tinted" type="email" value={profile.email} readOnly title="Change your email from Edit Profile" />
        </Field>
        <Field label="Phone Number">
          <TextControl variant="tinted" type="tel" autoComplete="tel" placeholder="+63 912 345 6789" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
        <Field label="Date of Birth">
          <TextControl variant="tinted" type="date" max={todayISO()} value={form.dateOfBirth} onChange={(event) => setForm({ ...form, dateOfBirth: event.target.value })} />
        </Field>
        <Field label="Gender">
          <SelectControl variant="tinted" value={form.gender} onChange={(gender) => setForm({ ...form, gender })} options={genders} placeholder="Select Gender" />
        </Field>
      </div>
    </Screen>
  );
}
