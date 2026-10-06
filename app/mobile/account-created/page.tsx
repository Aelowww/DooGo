"use client";

import { useAuth } from "@/app/_components/auth-provider";
import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function AccountCreatedPage() {
  const { user } = useAuth();
  return (
    <StatusScreen
      icon="success"
      title="Account Created!"
      message={user
        ? "Welcome to DooGo. Let's set up your profile\nso we can match you with people nearby."
        : "Your account has been successfully\ncreated!"}
      actions={user
        ? <ButtonLink href="/onboarding">Set Up My Profile</ButtonLink>
        : <ButtonLink href="/sign-in">Go to Sign In</ButtonLink>}
    />
  );
}
