"use client";

import { useState } from "react";
import { useSession } from "@/app/mobile/_components/session";
import { useToast } from "@/app/_components/toast";
import { Trash } from "@phosphor-icons/react";
import { Alert, BackButton, Button, Heading, IconWell, MenuRow, Screen, Toggle } from "@/app/mobile/_components/ui";
import { updateUserProfile, type PrivacySettings } from "@/lib/users";

const settings: { key: keyof PrivacySettings; label: string; description: string }[] = [
  { key: "showProfile", label: "Show Profile to Donors", description: "Make your account visible in search listings" },
  { key: "showBloodType", label: "Show Blood Type Publicly", description: "Display your blood group on public request feeds" },
  { key: "allowLocation", label: "Allow Location Access", description: "Use GPS coordinates to locate nearby donors" },
  { key: "showDonationHistory", label: "Show Donation History", description: "Share previous success badges on your profile" },
];

export default function PrivacySettingsPage() {
  const { profile } = useSession();
  const [privacy, setPrivacy] = useState(profile.privacy);
  const [status, setStatus] = useState<{ type: "saved" | "error"; text: string } | null>(null);
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function change(key: keyof PrivacySettings, value: boolean) {
    setStatus(null);
    if (key === "allowLocation" && value) {
      // Ask the browser up front so the toggle reflects what the user actually granted.
      const granted = await new Promise<boolean>((resolve) => {
        if (!("geolocation" in navigator)) return resolve(false);
        navigator.geolocation.getCurrentPosition(() => resolve(true), () => resolve(false), { timeout: 10_000 });
      });
      if (!granted) {
        setStatus({ type: "error", text: "Location permission was not granted. You can enable it in your browser settings." });
        return;
      }
    }
    setPrivacy((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      await updateUserProfile(profile, { privacy });
      setStatus(null);
      toast("Changes saved", { body: "Your privacy settings have been saved." });
    } catch {
      setStatus({ type: "error", text: "We couldn't save your settings. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen gap={16} footer={<Button size="compact" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>}>
      <BackButton href="/profile" />
      <Heading title="Privacy Settings" />
      {status?.type === "error" && <Alert>{status.text}</Alert>}
      {settings.map((setting) => (
        <MenuRow
          key={setting.key}
          label={setting.label}
          description={setting.description}
          trailing={<Toggle label={setting.label} checked={privacy[setting.key]} onChange={(value) => change(setting.key, value)} />}
        />
      ))}
      {/* Kept out of the main Settings list so it isn't tapped by accident. */}
      <div style={{ marginTop: 16 }}>
        <MenuRow href="/profile/delete" label="Delete account" description="Permanently remove your profile, medical record, and data" muted icon={<IconWell icon={Trash} round tone="white" />} />
      </div>
    </Screen>
  );
}
