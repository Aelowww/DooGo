"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/_components/auth-provider";
import { SplashLogo } from "@/app/mobile/_components/splash-logo";
import { ButtonLink, Icon, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import styles from "./page.module.css";

export default function SplashPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Signed-in users still see the logo build, then go straight to the dashboard.
  useEffect(() => {
    if (loading || !user) return;
    const timer = window.setTimeout(() => router.replace("/home"), 1700);
    return () => window.clearTimeout(timer);
  }, [loading, user, router]);

  return (
    <Screen
      hero
      className={styles.content}
      footer={
        <div className={cx(uiStyles.form, styles.reveal, styles.actions)}>
          <ButtonLink href="/sign-in">Get Started</ButtonLink>
          <ButtonLink href="/help" variant="outline">Learn More</ButtonLink>
        </div>
      }
    >
      <h1 className={cx(uiStyles.heroTitle, styles.reveal)}>Welcome!</h1>
      <SplashLogo />
      <div className={cx(styles.tagline, styles.reveal)}>
        <Icon src="/splash/pulse-motif.svg" width={26} height={6} />
        <p>Connecting donors. Saving lives.</p>
        <Icon src="/splash/community-motif.svg" width={26} height={6} />
      </div>
      <div className={cx(styles.motifs, styles.reveal)} aria-hidden="true">
        <Icon src="/splash/drop-motif.svg" width={28} height={4} />
        <Icon src="/splash/heart-motif.svg" width={28} height={4} />
      </div>
    </Screen>
  );
}
