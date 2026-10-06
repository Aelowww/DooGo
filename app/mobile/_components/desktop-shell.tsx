"use client";

import { Bell, CalendarCheck, CaretDown, CheckCircle, EnvelopeSimple, GearSix, HandHeart, House, MagnifyingGlass, Question, SignOut, User, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { initials } from "@/lib/format";
import { publicPath } from "@/lib/layout";
import { useBadges, type Badges } from "./badges";
import { useOptionalSession } from "./contexts";
import { SplashLogo } from "./splash-logo";
import styles from "./desktop.module.css";

// This file must not import ./ui (ui renders these shells), so it keeps its own tiny helpers.
const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

type DesktopNav = { label: string; href: string; icon: PhosphorIcon; match: RegExp; badge?: keyof Badges };

const nav: DesktopNav[] = [
  { label: "Home", href: "/home", icon: House, match: /^\/(home|request-blood|donors|request-sent|donate)(\/|$)/ },
  { label: "Requests", href: "/requests", icon: HandHeart, match: /^\/requests(\/|$)/, badge: "requests" },
  { label: "Messages", href: "/messages", icon: EnvelopeSimple, match: /^\/messages(\/|$)/, badge: "messages" },
];

const countLabel = (count: number) => (count > 9 ? "9+" : count);

/** Signed-in desktop layout: branded top header + centered content column. */
export function DesktopAppShell({ children, wide = false, bare = false }: { children: React.ReactNode; wide?: boolean; bare?: boolean }) {
  const pathname = publicPath(usePathname());
  const badges = useBadges();
  const session = useOptionalSession();
  const profile = session?.profile;
  const onNotifications = /^\/notifications(\/|$)/.test(pathname);
  const onProfile = /^\/profile(\/|$)/.test(pathname);

  return (
    <div className={cx("doogo-desktop doogo-app", styles.app)}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/home" className={styles.brand} aria-label="DooGo home">
            <Image src="/logo/doogo_logo.svg" alt="DooGo" width={96} height={49} unoptimized priority />
          </Link>

          <nav className={styles.nav} aria-label="Main navigation">
            {nav.map((item) => {
              const active = item.match.test(pathname);
              const count = item.badge ? badges[item.badge] : 0;
              return (
                <Link key={item.href} href={item.href} className={cx(styles.navLink, active && styles.navActive)} aria-current={active ? "page" : undefined}>
                  <item.icon size={22} weight={active ? "fill" : "duotone"} aria-hidden="true" />
                  <span>{item.label}</span>
                  {count > 0 && <b className={styles.count} aria-label={`${count} new`}>{countLabel(count)}</b>}
                </Link>
              );
            })}
          </nav>

          <div className={styles.actions}>
            <Link href="/notifications" className={cx(styles.iconButton, onNotifications && styles.iconActive)} aria-label="Notifications" aria-current={onNotifications ? "page" : undefined}>
              <Bell size={22} weight={onNotifications ? "fill" : "duotone"} aria-hidden="true" />
              {badges.notifications > 0 && <b className={styles.dotCount}>{countLabel(badges.notifications)}</b>}
            </Link>
            {profile && <AccountMenu name={profile.fullName} email={profile.email} photo={profile.photoURL} active={onProfile} />}
          </div>
        </div>
      </header>

      <main className={cx(styles.main, bare && styles.mainBare)}>
        <div className={cx(styles.column, wide && styles.wide, bare && styles.bare)}>{children}</div>
      </main>
    </div>
  );
}

const accountLinks = [
  { href: "/profile", label: "Profile & settings", icon: GearSix },
  { href: "/profile/personal", label: "Personal information", icon: User },
  { href: "/donate", label: "Donating", icon: HandHeart },
  { href: "/help", label: "Help & support", icon: Question },
];

/** Avatar button that opens a small account menu, like most web apps. */
function AccountMenu({ name, email, photo, active }: { name: string; email: string; photo: string | null; active: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape (links close it on click).
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const avatar = (size: number) => (
    <span className={styles.avatar} style={{ width: size, height: size }}>
      {photo ? <Image src={photo} alt="" fill sizes={`${size}px`} unoptimized /> : initials(name)}
    </span>
  );

  return (
    <div ref={rootRef} className={styles.account}>
      <button
        type="button"
        className={cx(styles.user, (open || active) && styles.userActive)}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {avatar(36)}
        <span className={styles.userName}>{name.split(" ")[0] || "Account"}</span>
        <CaretDown className={cx(styles.caret, open && styles.caretOpen)} size={14} weight="bold" aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHead}>
            {avatar(44)}
            <span>
              <strong>{name || "Your account"}</strong>
              <small>{email}</small>
            </span>
          </div>
          {accountLinks.map((item) => (
            <Link key={item.href} href={item.href} role="menuitem" className={styles.menuItem} onClick={() => setOpen(false)}>
              <item.icon size={20} aria-hidden="true" /> {item.label}
            </Link>
          ))}
          <Link href="/profile/logout" role="menuitem" className={cx(styles.menuItem, styles.menuDanger)} onClick={() => setOpen(false)}>
            <SignOut size={20} aria-hidden="true" /> Log out
          </Link>
        </div>
      )}
    </div>
  );
}

const features = [
  { icon: MagnifyingGlass, title: "Find compatible donors", body: "Search available donors near you by blood type and city." },
  { icon: CheckCircle, title: "Send and track requests", body: "Know the moment a donor accepts, and follow up in chat." },
  { icon: CalendarCheck, title: "Donate when you're ready", body: "Turn your availability on or off anytime. We track your eligibility." },
];

/** Public desktop layout (sign in, create account, …): brand panel + form panel. `hero` centers a single column instead. */
export function DesktopAuthShell({ children, hero = false }: { children: React.ReactNode; hero?: boolean }) {
  if (hero) {
    return (
      <div className={cx("doogo-desktop doogo-auth", styles.hero)}>
        <div className={styles.heroInner}>{children}</div>
      </div>
    );
  }

  // One card: brand story on the left, the form on the right, so the two read as a single screen.
  return (
    <div className={cx("doogo-desktop doogo-auth", styles.auth)}>
      <div className={styles.authCard}>
        <aside className={styles.brandPanel}>
          <span className={styles.brandDrop} aria-hidden="true" />
          <Link href="/splash" aria-label="DooGo" className={styles.brandLink}>
            <SplashLogo animate={false} className={styles.brandLogo} />
          </Link>
          <div className={styles.pitch}>
            <h2>Connecting donors.<br />Saving lives.</h2>
            <p>DooGo matches people who need blood with compatible, available donors in their community.</p>
          </div>
          <ul className={styles.features}>
            {features.map((feature) => (
              <li key={feature.title}>
                <span><feature.icon size={20} weight="fill" aria-hidden="true" /></span>
                <div>
                  <strong>{feature.title}</strong>
                  <p>{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </aside>
        <main className={styles.formPanel}>
          <div className={styles.formInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
