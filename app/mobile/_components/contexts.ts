"use client";

import { createContext, useContext } from "react";
import type { User } from "firebase/auth";
import type { Layout } from "@/lib/layout";
import type { UserProfile } from "@/lib/users";

/** Which shell the shared screens render into: the phone frame or the desktop app. */
export const LayoutContext = createContext<Layout>("mobile");

export function useLayout() {
  return useContext(LayoutContext);
}

export type Session = { user: User; profile: UserProfile };

/** Set by SessionGate on signed-in screens; null on public screens. */
export const SessionContext = createContext<Session | null>(null);

export function useOptionalSession() {
  return useContext(SessionContext);
}
