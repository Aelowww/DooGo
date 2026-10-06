"use client";

import { useRef, useState } from "react";
import { verifyBeforeUpdateEmail } from "firebase/auth";
import { useSession } from "@/app/mobile/_components/session";
import { useToast } from "@/app/_components/toast";
import { Alert, Button, Field, ProfilePhoto, Screen, TextControl, TopBar, uiStyles } from "@/app/mobile/_components/ui";
import { friendlyAuthError } from "@/lib/format";
import { toAvatarDataUrl } from "@/lib/photo";
import { updateUserProfile } from "@/lib/users";
import styles from "./page.module.css";

const maxPhotoBytes = 15 * 1024 * 1024;

export default function EditProfilePage() {
  const { user, profile } = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ fullName: profile.fullName, email: profile.email, phone: profile.phone });
  const [status, setStatus] = useState<{ type: "saved" | "error"; text: string } | null>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function changePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setStatus({ type: "error", text: "Choose an image file." });
    if (file.size > maxPhotoBytes) return setStatus({ type: "error", text: "Choose a photo under 15 MB." });
    setUploading(true);
    setStatus(null);
    try {
      const photoURL = await toAvatarDataUrl(file);
      await updateUserProfile(profile, { photoURL });
      setStatus(null);
      toast("Changes saved", { body: "Profile photo updated." });
    } catch {
      setStatus({ type: "error", text: "We couldn't use that photo. Please try another image." });
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    if (!fullName) return setStatus({ type: "error", text: "Enter your full name." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return setStatus({ type: "error", text: "Enter a valid email address." });
    if (form.phone && !/^\+?[\d\s()-]{7,20}$/.test(form.phone)) return setStatus({ type: "error", text: "Enter a valid phone number." });
    setSaving(true);
    setStatus(null);
    try {
      await updateUserProfile(profile, { fullName, phone: form.phone.trim() });
      if (email.toLowerCase() !== profile.email.toLowerCase()) {
        // Firebase only switches the sign-in email after the new address is confirmed.
        await verifyBeforeUpdateEmail(user, email);
        setStatus(null);
      toast("Changes saved", { body: `Profile saved. We sent a link to ${email} — your email changes once you confirm it.` });
      } else {
        setStatus(null);
      toast("Changes saved", { body: "Your profile has been updated." });
      }
    } catch (caught) {
      setStatus({ type: "error", text: friendlyAuthError(caught) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      onSubmit={submit}
      topBar={<TopBar title="Edit Profile" backHref="/profile" />}
      footer={<Button type="submit" size="compact" disabled={saving || uploading}>{saving ? "Saving…" : "Save Changes"}</Button>}
    >
      <div className={styles.photo}>
        <ProfilePhoto src={profile.photoURL} size={100} ring="white" />
        <button type="button" className={styles.changePhoto} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Change Photo"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={changePhoto} />
      </div>
      <div className={uiStyles.form}>
        {status?.type === "error" && <Alert>{status.text}</Alert>}
        <Field label="Full Name">
          <TextControl variant="tinted" autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        </Field>
        <Field label="Email Address">
          <TextControl variant="tinted" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </Field>
        <Field label="Phone Number">
          <TextControl variant="tinted" type="tel" autoComplete="tel" placeholder="+63 912 345 6789" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        </Field>
      </div>
    </Screen>
  );
}
