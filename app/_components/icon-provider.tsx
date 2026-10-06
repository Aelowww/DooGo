"use client";

import { IconContext } from "@phosphor-icons/react";

/** Every Phosphor icon in DooGo renders as Duotone unless a screen asks for another weight. */
export function IconProvider({ children }: { children: React.ReactNode }) {
  return <IconContext.Provider value={{ weight: "duotone", mirrored: false }}>{children}</IconContext.Provider>;
}
