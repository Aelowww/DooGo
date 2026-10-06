"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/_components/auth-provider";
import { publicPath } from "@/lib/layout";
import { createUserProfile, updateUserProfile } from "@/lib/users";
import { BadgeProvider } from "./badges";
import { BloodDetailsPrompt, needsBloodDetails } from "./blood-details-prompt";
import { SessionContext } from "./contexts";
import { ButtonLink, ListSkeleton, Screen, uiStyles } from "./ui";

/** Gate for every signed-in screen: waits for Firebase, redirects guests to Sign In, and exposes the profile. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = publicPath(usePathname());
  const { user, profile, loading, configured } = useAuth();
  const [repairing, setRepairing] = useState(false);
  const hadProfile = useRef(false);

  useEffect(() => {
    if (configured && !loading && !user) router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
  }, [configured, loading, user, router, pathname]);

  useEffect(() => {
    if (profile) hadProfile.current = true;
  }, [profile]);

  // Accounts created outside the app (e.g. in the Firebase console) get a profile on first sign-in.
  // Never recreate a profile that disappeared mid-session — that's an account being deleted.
  useEffect(() => {
    if (loading || !user || profile || repairing || hadProfile.current) return;
    setRepairing(true);
    createUserProfile(user.uid, user.displayName || user.email?.split("@")[0] || "", user.email || "").finally(() => setRepairing(false));
  }, [loading, user, profile, repairing]);

  // New accounts finish the short setup flow before using the app.
  const needsOnboarding = Boolean(profile && profile.onboarded === false && pathname !== "/onboarding");
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  // After a confirmed email change (Edit Profile), Firebase Auth has the new address; mirror it.
  useEffect(() => {
    if (user?.email && profile && user.email !== profile.email) updateUserProfile(profile, { email: user.email }).catch(() => {});
  }, [user, profile]);

  if (!configured) {
    return (
      <Screen>
        <h1 className={uiStyles.screenTitle}>Connect Firebase</h1>
        <p className={uiStyles.body}>
          DooGo needs a Firebase project. Copy <code>.env.example</code> to <code>.env.local</code>, fill in your Firebase web app keys, and restart the dev server.
        </p>
        <ButtonLink href="/splash" variant="outline">Back</ButtonLink>
      </Screen>
    );
  }

  if (loading || !user || !profile || needsOnboarding) {
    // Keep the signed-in frame (sidebar on desktop) while Firebase restores the session,
    // so the page doesn't flash the sign-in layout first.
    return (
      <Screen appShell wide>
        <ListSkeleton count={4} />
      </Screen>
    );
  }

  return (
    <SessionContext.Provider value={{ user, profile }}>
      <BadgeProvider uid={user.uid}>
        {children}
        {/* Onboarding asks for these itself; everywhere else, missing blood details block the app. */}
        {pathname !== "/onboarding" && needsBloodDetails(profile) && <BloodDetailsPrompt profile={profile} />}
      </BadgeProvider>
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside a signed-in screen.");
  return session;
}
