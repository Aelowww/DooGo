"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Screen, StatusIcon, uiStyles } from "./_components/ui";

export default function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Screen
      footer={
        <>
          <Button onClick={reset}>Try Again</Button>
          <ButtonLink href="/home" variant="outline">Go to Dashboard</ButtonLink>
        </>
      }
    >
      <section className={uiStyles.statusBody}>
        <StatusIcon kind="declined" />
        <div className={uiStyles.statusCopy}>
          <h1 className={uiStyles.heroTitle}>Something went wrong</h1>
          <p className={uiStyles.intro}>Check your internet connection and try again.</p>
        </div>
      </section>
    </Screen>
  );
}
