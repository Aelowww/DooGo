import type { Timestamp } from "firebase/firestore";

export type DateLike = Timestamp | Date | string | null | undefined;

export function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return value.toDate();
}

/** "Carl Gemuel Tan" → "Carl T." — how people are shown to each other in DooGo. */
export function shortName(fullName: string | null | undefined) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "DooGo user";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function firstName(fullName: string | null | undefined) {
  return (fullName || "").trim().split(/\s+/)[0] || "there";
}

export function initials(name: string | null | undefined) {
  const parts = (name || "").replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

/** 08/14/2026 */
export function formatDate(value: DateLike) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

/** 09/10/26 */
export function formatShortDate(value: DateLike) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

/** October 12, 1996 */
export function formatLongDate(value: DateLike) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** 2:30 PM */
export function formatTime(value: DateLike) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "2 mins ago", "1 hour ago", "Yesterday", "3 days ago" */
export function timeAgo(value: DateLike, now = new Date()) {
  const date = toDate(value);
  if (!date) return "Just now";
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

/** Conversation list stamp: today → "2:30 PM", yesterday → "Yesterday", else "3 days ago" / date. */
export function chatStamp(value: DateLike, now = new Date()) {
  const date = toDate(value);
  if (!date) return "";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.floor((startOfToday - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  if (dayDiff <= 0) return formatTime(date);
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return formatDate(date);
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function friendlyAuthError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-login-credentials":
      return "Invalid email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/requires-recent-login":
      return "For your security, please confirm your password to continue.";
    case "auth/network-request-failed":
      return "No internet connection. Please try again.";
    default:
      return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }
}
