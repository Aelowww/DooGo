"use client";

import { useEffect } from "react";
import { desktopMinWidth, forcedLayout, layoutCookie, type Layout } from "@/lib/layout";

/** Keeps the layout cookie in sync with the window width and reloads when it crosses the breakpoint. */
export function LayoutSwitch() {
  useEffect(() => {
    if (forcedLayout) return;
    const query = window.matchMedia(`(min-width: ${desktopMinWidth}px)`);

    const savedLayout = () => document.cookie.match(new RegExp(`(?:^|; )${layoutCookie}=([^;]*)`))?.[1];

    function sync() {
      const layout: Layout = query.matches ? "desktop" : "mobile";
      if (savedLayout() === layout) return;
      document.cookie = `${layoutCookie}=${layout}; path=/; max-age=31536000; samesite=lax`;
      if (savedLayout() === layout) window.location.reload();
    }

    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return null;
}
