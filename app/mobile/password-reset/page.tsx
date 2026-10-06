"use client";

import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function PasswordResetSentPage() {
  return (
    <StatusScreen
      icon="success"
      title="Check Your Email!"
      message="We've sent a password reset link to your email. Please click the link to configure your credentials."
      actions={<ButtonLink href="/sign-in">Back to Sign In</ButtonLink>}
    />
  );
}
