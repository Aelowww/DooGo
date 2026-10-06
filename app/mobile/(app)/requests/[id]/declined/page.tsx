"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function RequestDeclinedPage() {
  return (
    <Suspense fallback={null}>
      <RequestDeclined />
    </Suspense>
  );
}

function RequestDeclined() {
  const name = useSearchParams().get("name") || "the requester";
  return (
    <StatusScreen
      icon="declined"
      title="Request Declined"
      message={`The request from ${name} has been\ndeclined. They will be notified.`}
      actions={<ButtonLink href="/home">Go to Dashboard</ButtonLink>}
    />
  );
}
