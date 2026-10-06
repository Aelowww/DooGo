"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonLink, StatusScreen } from "@/app/mobile/_components/ui";

export default function InformationSavedPage() {
  return (
    <Suspense fallback={null}>
      <InformationSaved />
    </Suspense>
  );
}

function InformationSaved() {
  const available = useSearchParams().get("available") !== "0";
  return (
    <StatusScreen
      icon="success"
      back="/donate"
      title="Information Saved!"
      message={available ? "You are now an available\ndonor" : "Your donor details are saved.\nTurn on availability when you're ready."}
      actions={<ButtonLink href="/home">Go to Dashboard</ButtonLink>}
    />
  );
}
