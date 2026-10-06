"use client";

import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function StatusUnavailablePage() {
  return (
    <StatusScreen
      icon="unavailable"
      back="/donate"
      title="You're Unavailable"
      message={"You are not visible to\nblood seeker"}
      actions={<ButtonLink href="/home" size="compact">Go to Dashboard</ButtonLink>}
    />
  );
}
