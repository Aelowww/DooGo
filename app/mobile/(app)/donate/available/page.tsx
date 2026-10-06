"use client";

import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function StatusAvailablePage() {
  return (
    <StatusScreen
      icon="available"
      back="/donate"
      title="You're Available"
      message={"You are now visible to\nblood seeker"}
      actions={<ButtonLink href="/home" size="compact">Go to Dashboard</ButtonLink>}
    />
  );
}
