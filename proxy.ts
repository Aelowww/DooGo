import { NextResponse, userAgent, type NextRequest } from "next/server";
import { forcedLayout, layoutCookie, type Layout } from "@/lib/layout";

// Same approach as Teech: screens live under app/mobile and app/desktop, and clean URLs (/home, /requests, …)
// are rewritten to whichever layout fits the device. The cookie (kept in sync by LayoutSwitch) wins over the
// user agent so resizing a desktop window to phone width switches layouts.
// Sign-in protection happens client-side (see app/mobile/(app)/layout.tsx) because Firebase Auth keeps its session in the browser.
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const layoutPrefix = pathname.match(/^\/(mobile|desktop)(?=\/|$)/);
  if (layoutPrefix) {
    return NextResponse.redirect(new URL(pathname.slice(layoutPrefix[0].length) || "/", request.url));
  }

  // The splash is a first-visit welcome; returning browsers go straight to the app (signed-out ones then land on Sign In).
  if (pathname === "/") {
    const seen = request.cookies.get(splashCookie)?.value === "1";
    return NextResponse.redirect(new URL(seen ? "/home" : "/splash", request.url));
  }

  if (sharedPaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.next();
  }

  const savedLayout = request.cookies.get(layoutCookie)?.value;
  const layout: Layout = forcedLayout
    ?? (savedLayout === "desktop" || savedLayout === "mobile" ? savedLayout : userAgent(request).device.type ? "mobile" : "desktop");

  const url = request.nextUrl.clone();
  url.pathname = `/${layout}${pathname}`;
  const response = NextResponse.rewrite(url);
  if (pathname === "/splash") response.cookies.set(splashCookie, "1", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  if (savedLayout !== layout) response.cookies.set(layoutCookie, layout, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return response;
}

const splashCookie = "doogo-seen-splash";

const sharedPaths = ["/api", "/manifest.webmanifest"];

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)",
  ],
};
