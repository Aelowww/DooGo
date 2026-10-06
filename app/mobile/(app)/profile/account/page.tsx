"use client";

import { DeviceMobile, EnvelopeSimple, LockKey, Question, ShieldCheck, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, ButtonLink, IconWell, MenuRow, Screen, Toggle, TopBar } from "@/app/mobile/_components/ui";
import { updateUserProfile, type NotificationSettings } from "@/lib/users";

export default function ManageAccountPage() {
  const { profile } = useSession();
  const [error, setError] = useState("");

  async function setNotification(key: keyof NotificationSettings, value: boolean) {
    setError("");
    try {
      await updateUserProfile(profile, { notifications: { ...profile.notifications, [key]: value } });
    } catch {
      setError("We couldn't update your notification settings. Please try again.");
    }
  }

  return (
    <Screen
      topBar={<TopBar title="Manage Account" backHref="/profile" />}
      gap={12}
      footer={<ButtonLink href="/profile/logout" variant="outline" size="compact">Log Out</ButtonLink>}
    >
      {error && <Alert>{error}</Alert>}
      <MenuRow href="/profile/password" label="Change Password" icon={<IconWell icon={LockKey} round />} />
      <MenuRow
        icon={<IconWell icon={EnvelopeSimple} round />}
        label="Email Notifications"
        trailing={<Toggle label="Email notifications" checked={profile.notifications.email} onChange={(value) => setNotification("email", value)} />}
      />
      <MenuRow
        icon={<IconWell icon={DeviceMobile} round />}
        label="SMS Notifications"
        trailing={<Toggle label="SMS notifications" checked={profile.notifications.sms} onChange={(value) => setNotification("sms", value)} />}
      />
      <MenuRow href="/profile/privacy" label="Privacy Settings" icon={<IconWell icon={ShieldCheck} round />} />
      <MenuRow href="/help" label="Help & Support" icon={<IconWell icon={Question} round />} />
      <MenuRow href="/profile/delete" label="Delete Account" muted icon={<IconWell icon={Trash} round tone="white" />} />
    </Screen>
  );
}
