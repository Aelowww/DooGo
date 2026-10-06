"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, StatusScreen, Steps } from "@/app/mobile/_components/ui";

export default function RequestSentPage() {
  return (
    <Suspense fallback={null}>
      <RequestSent />
    </Suspense>
  );
}

function RequestSent() {
  const params = useSearchParams();
  const count = Number(params.get("count")) || 0;
  // Short names already end in a period ("Paolo G."), so don't add another.
  const name = (params.get("name") || "the donor").replace(/\.$/, "");
  return (
    <StatusScreen
      icon="success"
      above={<Steps steps={["Details", "Donors", "Sent"]} current={3} />}
      title={count > 1 ? "Requests Sent!" : "Request Sent!"}
      message={count > 1 ? `Your request has been sent\nto ${count} compatible donors.` : `Your request has been\nsent to ${name}.`}
      note={count > 1 ? "You will be notified as each donor responds." : "You will be notified once they respond."}
      actions={
        <>
          <ButtonLink href="/requests">Track My Requests</ButtonLink>
          <ButtonLink href="/home" variant="outline">Go to Dashboard</ButtonLink>
        </>
      }
    />
  );
}
