"use client";

import type { Layout } from "@/lib/layout";
import { LayoutContext } from "./contexts";

export function LayoutProvider({ layout, children }: { layout: Layout; children: React.ReactNode }) {
  return <LayoutContext.Provider value={layout}>{children}</LayoutContext.Provider>;
}
