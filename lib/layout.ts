export type Layout = "mobile" | "desktop";

export const layoutCookie = "doogo-layout";

/** Windows at least this wide get the desktop layout. */
export const desktopMinWidth = 1024;

/** usePathname() can include the internal /mobile or /desktop rewrite prefix; this returns the public path. */
export function publicPath(pathname: string | null) {
  return (pathname || "/").replace(/^\/(mobile|desktop)(?=\/|$)/, "") || "/";
}

/**
 * Returns `path` only if it's a page inside this app ("/requests/abc"), otherwise null.
 * Blocks open redirects like "//evil.com", "/\evil.com", or "https://evil.com".
 */
export function safeInternalPath(path: string | null | undefined) {
  if (!path || !path.startsWith("/") || path.startsWith("//") || /[\\\s]/.test(path)) return null;
  return path;
}

/** Set to "mobile" or "desktop" to force one layout everywhere (handy while designing). */
export const forcedLayout: Layout | null = null;
