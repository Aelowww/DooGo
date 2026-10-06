"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { subscribeUserProfile, touchLastActive, type UserProfile } from "@/lib/users";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true, configured: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(configured);
  const [profileLoading, setProfileLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(firebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
      } else {
        setProfileLoading(true);
      }
    });
  }, [configured]);

  useEffect(() => {
    if (!user) return;
    return subscribeUserProfile(
      user.uid,
      (next) => {
        setProfile(next);
        setProfileLoading(false);
      },
      () => setProfileLoading(false),
    );
  }, [user]);

  // Keeps "Active Now" in chats accurate while the app is open.
  useEffect(() => {
    if (!user) return;
    const ping = () => {
      if (document.visibilityState === "visible") touchLastActive(user.uid).catch(() => {});
    };
    ping();
    const timer = window.setInterval(ping, 2 * 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading: authLoading || profileLoading, configured }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
