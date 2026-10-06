"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function RequestAcceptedPage() {
  return (
    <Suspense fallback={null}>
      <RequestAccepted />
    </Suspense>
  );
}

function RequestAccepted() {
  const params = useSearchParams();
  // Short names already end in a period ("Maria S."), so don't add another.
  const name = (params.get("name") || "the requester").replace(/\.$/, "");
  const chat = params.get("chat");
  return (
    <StatusScreen
      icon="success"
      title="Request Accepted!"
      message={`You have accepted the blood request from ${name}.\nWe've opened a chat so you can agree on a time.`}
      actions={
        <>
          {chat && <ButtonLink href={`/messages/${chat}`}>Message {name}</ButtonLink>}
          <ButtonLink href="/home" variant={chat ? "outline" : "primary"}>Go to Dashboard</ButtonLink>
        </>
      }
    />
  );
}
