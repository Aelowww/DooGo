"use client";

import {
  CaretLeft,
  Bell,
  CaretDown,
  CaretRight,
  Check,
  EnvelopeSimple,
  Eye,
  EyeSlash,
  HandHeart,
  HeartBreak,
  Heartbeat,
  Hourglass,
  House,
  User,
  Warning,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { initials } from "@/lib/format";
import { publicPath } from "@/lib/layout";
import { urgencyInfo, type Urgency } from "@/lib/blood";
import { statusLabel, type DisplayStatus } from "@/lib/requests";
import { useBadges, type Badges } from "./badges";
import { useLayout, useOptionalSession } from "./contexts";
import { DesktopAppShell, DesktopAuthShell } from "./desktop-shell";
import buttonStyles from "./button.module.css";
import styles from "./ui.module.css";

export { buttonStyles, styles as uiStyles };

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Static SVG asset from /public, rendered at its design size. */
export function Icon({ src, size, width, height, alt = "", className }: {
  src: string;
  size?: number;
  width?: number;
  height?: number;
  alt?: string;
  className?: string;
}) {
  return <Image className={className} src={src} alt={alt} width={width ?? size ?? 24} height={height ?? size ?? 24} unoptimized />;
}

/** A Lucide icon in a rounded tinted well — DooGo's one icon style for menus, lists and tiles. */
export function IconWell({ icon: IconComponent, size = 40, tone = "tinted", round = false, className }: {
  icon: PhosphorIcon;
  size?: number;
  tone?: "tinted" | "solid" | "white";
  round?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(styles.well, styles[`well_${tone}`], className)}
      style={{ width: size, height: size, borderRadius: round ? size / 2 : Math.round(size * 0.3) }}
      aria-hidden="true"
    >
      <IconComponent size={Math.round(size * 0.48)} />
    </span>
  );
}

/* ---------- Shell ---------- */

export type NavTab = "home" | "requests" | "messages" | "profile";

export function Screen({
  children,
  nav,
  topBar,
  footer,
  gap,
  className,
  onSubmit,
  wide = false,
  hero = false,
  bare = false,
  appShell = false,
}: {
  children?: React.ReactNode;
  nav?: NavTab;
  topBar?: React.ReactNode;
  footer?: React.ReactNode;
  gap?: 12 | 16 | 20;
  className?: string;
  /** Renders the screen as a form so footer buttons can submit it. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** Desktop: use the wider content column (dashboards and lists). */
  wide?: boolean;
  /** Desktop: a single centered column instead of the split sign-in layout (splash). */
  hero?: boolean;
  /** Children fill the screen with no content padding (chat). `className` goes on the frame. */
  bare?: boolean;
  /** Desktop: force the signed-in app frame even before the session is ready (loading states). */
  appShell?: boolean;
}) {
  const layout = useLayout();
  const session = useOptionalSession();
  const pathname = publicPath(usePathname());
  const desktop = layout === "desktop";

  const body = bare ? children : (
    <>
      {topBar}
      <div className={cx(styles.content, Boolean(topBar) && styles.contentUnderBar, gap && styles[`gap${gap}`], className)}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
      {nav && !desktop && <BottomNav active={nav} />}
    </>
  );

  if (desktop) {
    const frame = onSubmit
      ? <form className={styles.desktopFrame} onSubmit={onSubmit} noValidate>{body}</form>
      : <div className={cx(styles.desktopFrame, bare && className)}>{body}</div>;
    if (session || appShell) return <DesktopAppShell wide={wide || bare} bare={bare}>{frame}</DesktopAppShell>;
    return <DesktopAuthShell hero={hero}>{frame}</DesktopAuthShell>;
  }

  // Mobile mirrors desktop: signed-in pages get the red app bar, sign-in pages the red brand band.
  const signedIn = Boolean(session || appShell);
  const authBand = !signedIn && !hero && authPages.test(pathname);
  const phoneClass = cx(styles.phone, signedIn && styles.phoneApp, authBand && "doogo-auth");
  const framed = (
    <>
      {signedIn && !bare && <MobileAppBar />}
      {authBand && <AuthBand />}
      {body}
    </>
  );

  return (
    <main className={styles.stage}>
      {onSubmit
        ? <form className={phoneClass} onSubmit={onSubmit} noValidate>{framed}</form>
        : <div className={cx(phoneClass, bare && className)}>{framed}</div>}
    </main>
  );
}

/** Mobile version of the desktop header: white logo on the red bar, notifications, and your avatar. */
function MobileAppBar() {
  const session = useOptionalSession();
  const badges = useBadges();
  const profile = session?.profile;
  const count = badges.notifications;
  return (
    <header className={styles.appBar}>
      <Link href="/home" aria-label="DooGo home" className={styles.appBarLogo}>
        <Image src="/logo/doogo_logo.svg" alt="DooGo" width={84} height={42} unoptimized priority />
      </Link>
      <span className={styles.appBarActions}>
        <Link href="/notifications" className={styles.appBarButton} aria-label={count ? `Notifications, ${count} new` : "Notifications"}>
          <Bell size={20} weight="duotone" aria-hidden="true" />
          {count > 0 && <b>{count > 9 ? "9+" : count}</b>}
        </Link>
        {profile && (
          <Link href="/profile" className={styles.appBarAvatar} aria-label="Profile and settings">
            {profile.photoURL ? <Image src={profile.photoURL} alt="" fill sizes="36px" unoptimized /> : initials(profile.fullName)}
          </Link>
        )}
      </span>
    </header>
  );
}

/** Mobile sign-in pages: just the logo above the form. */
function AuthBand() {
  return (
    <div className={styles.authBand}>
      <Image src="/logo/doogo_logo.svg" alt="DooGo" width={150} height={76} unoptimized priority />
    </div>
  );
}

/** Human names for routes, used by breadcrumbs and back links. */
const pageLabels: [RegExp, string][] = [
  [/^\/home$/, "Home"],
  [/^\/requests$/, "Requests"],
  [/^\/requests\/[^/]+\/accepted$/, "Request accepted"],
  [/^\/requests\/[^/]+\/declined$/, "Request declined"],
  [/^\/requests\/[^/]+$/, "Request details"],
  [/^\/messages$/, "Messages"],
  [/^\/messages\/[^/]+$/, "Chat"],
  [/^\/notifications$/, "Notifications"],
  [/^\/request-blood$/, "Request blood"],
  [/^\/request-sent$/, "Request sent"],
  [/^\/donors$/, "Compatible donors"],
  [/^\/donors\/[^/]+$/, "Donor profile"],
  [/^\/donate$/, "Donating"],
  [/^\/donate\/setup$/, "Donor details"],
  [/^\/donate\/status$/, "Availability"],
  [/^\/donate\/saved$/, "Saved"],
  [/^\/profile$/, "Settings"],
  [/^\/profile\/personal$/, "Personal information"],
  [/^\/profile\/edit$/, "Edit profile"],
  [/^\/profile\/blood$/, "Blood information"],
  [/^\/profile\/donations$/, "Donation history"],
  [/^\/profile\/requests$/, "Request history"],
  [/^\/profile\/account$/, "Account"],
  [/^\/profile\/password$/, "Password & security"],
  [/^\/profile\/privacy$/, "Privacy"],
  [/^\/profile\/delete$/, "Delete account"],
  [/^\/profile\/logout$/, "Log out"],
  [/^\/help$/, "Help & support"],
  [/^\/sign-in$/, "Sign in"],
];

/** Where each section sits, so a breadcrumb can show the full trail back to Home. */
const sectionParents: [RegExp, string][] = [
  [/^\/profile\/.+/, "/profile"],
  [/^\/donate\/.+/, "/donate"],
  [/^\/donors/, "/request-blood"],
  [/^\/requests\/.+/, "/requests"],
  [/^\/messages\/.+/, "/messages"],
];

const authPages = /^\/(sign-in|create-account|forgot-password|password-reset)$/;

const pathOf = (href: string) => href.split(/[?#]/)[0];
const labelFor = (path: string) => pageLabels.find(([pattern]) => pattern.test(pathOf(path)))?.[1];
const parentOf = (path: string) => sectionParents.find(([pattern]) => pattern.test(pathOf(path)))?.[1] ?? "/home";

/**
 * "Go back" navigation. Desktop app pages get a breadcrumb trail (Home › Requests › Request details);
 * desktop sign-in pages need none (the card's own links route); mobile gets a plain "‹ Requests" link.
 */
export function BackButton({ href }: { href?: string; label?: string }) {
  const router = useRouter();
  const layout = useLayout();
  const session = useOptionalSession();
  const pathname = publicPath(usePathname());

  // The desktop sign-in card routes with its own links.
  if (layout === "desktop" && !session && authPages.test(pathname)) return null;

  if (layout === "desktop" && session) {
    // Trail: Home › …parents of the back target › back target › this page.
    const trail: { href: string; label: string }[] = [];
    let step: string | undefined = href;
    while (step && pathOf(step) !== "/home" && trail.length < 4) {
      trail.unshift({ href: step, label: labelFor(step) ?? "Back" });
      step = parentOf(step);
    }
    trail.unshift({ href: "/home", label: "Home" });
    return (
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
        <ol>
          {trail.map((crumb) => (
            <li key={crumb.href}>
              <Link href={crumb.href}>{crumb.label}</Link>
              <CaretRight size={12} weight="bold" aria-hidden="true" />
            </li>
          ))}
          <li aria-current="page">{labelFor(pathname) ?? "Details"}</li>
        </ol>
      </nav>
    );
  }

  const content = <><CaretLeft size={18} weight="bold" aria-hidden="true" /><span>{href ? (labelFor(href) ?? "Back") : "Back"}</span></>;
  if (href) return <Link className={styles.backLink} href={href}>{content}</Link>;
  return (
    <button type="button" className={styles.backLink} onClick={() => (window.history.length > 1 ? router.back() : router.push("/home"))}>
      {content}
    </button>
  );
}

export function NotificationButton({ unread }: { unread: boolean }) {
  return (
    <Link className={styles.iconButton} href="/notifications" aria-label={unread ? "Notifications, unread" : "Notifications"}>
      <Bell size={19} aria-hidden="true" />
      {unread && <i className={styles.iconButtonDot} aria-hidden="true" />}
    </Link>
  );
}

/** Header row used by list/settings screens: back · title · spacer. */
export function TopBar({ title, back = true, backHref }: { title: string; back?: boolean; backHref?: string }) {
  return (
    <header className={styles.topBar}>
      {back ? <BackButton href={backHref} /> : <span className={cx(styles.barSpacer, styles.barSpacerWide)} />}
      <h1>{title}</h1>
      <span className={styles.barSpacer} />
    </header>
  );
}

export function Heading({ title, subtitle, eyebrow, hero = false }: { title: string; subtitle?: React.ReactNode; eyebrow?: string; hero?: boolean }) {
  return (
    <div className={styles.heading}>
      {eyebrow && <p className={styles.intro}>{eyebrow}</p>}
      <h1 className={hero ? styles.heroTitle : styles.screenTitle}>{title}</h1>
      {subtitle && <p className={styles.intro}>{subtitle}</p>}
    </div>
  );
}

const navItems: { tab: NavTab; label: string; href: string; icon: PhosphorIcon; badge?: keyof Badges }[] = [
  { tab: "home", label: "Home", href: "/home", icon: House },
  { tab: "requests", label: "Requests", href: "/requests", icon: HandHeart, badge: "requests" },
  { tab: "messages", label: "Messages", href: "/messages", icon: EnvelopeSimple, badge: "messages" },
  { tab: "profile", label: "Profile", href: "/profile", icon: User },
];

export function BottomNav({ active }: { active: NavTab }) {
  const badges = useBadges();
  const renderItem = ({ tab, label, href, icon: NavIcon, badge }: (typeof navItems)[number]) => {
    const isActive = tab === active;
    const count = badge ? badges[badge] : 0;
    return (
      <Link
        key={tab}
        href={href}
        className={cx(styles.navItem, isActive && styles.navActive)}
        aria-current={isActive ? "page" : undefined}
        aria-label={count > 0 ? `${label}, ${count} new` : undefined}
      >
        <span className={styles.navPill}>
          <NavIcon size={24} weight={isActive ? "fill" : "duotone"} aria-hidden="true" />
          {count > 0 && <b className={styles.navBadge} aria-hidden="true">{count > 9 ? "9+" : count}</b>}
        </span>
        <span className={styles.navLabel}>{label}</span>
      </Link>
    );
  };

  return (
    <nav className={styles.bottomNav} aria-label="Main navigation">
      {navItems.map(renderItem)}
    </nav>
  );
}

/** Progress through a multi-step flow, e.g. Details → Donors → Sent. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className={styles.steps} aria-label={`Step ${current + 1} of ${steps.length}`}>
      {steps.map((step, index) => (
        <li
          key={step}
          className={cx(index < current && styles.stepDone, index === current && styles.stepCurrent)}
          aria-current={index === current ? "step" : undefined}
        >
          <span>{index < current ? <Check size={12} weight="bold" aria-hidden="true" /> : index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

/* ---------- Buttons ---------- */

type ButtonVariant = "primary" | "outline" | "tinted" | "ghost";

export function buttonClass(variant: ButtonVariant = "primary", size?: "compact" | "small") {
  return cx(buttonStyles.button, buttonStyles[variant], size && buttonStyles[size]);
}

export function Button({
  variant = "primary",
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "compact" | "small" }) {
  return <button type="button" className={cx(buttonClass(variant, size), className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: "compact" | "small" }) {
  return <Link className={cx(buttonClass(variant, size), className)} {...props} />;
}

/* ---------- Forms ---------- */

export function AuthInput({ icon: FieldIcon, error = false, type, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: PhosphorIcon; error?: boolean }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <label className={cx(styles.authInput, error && styles.authInputError)}>
      {FieldIcon && <FieldIcon className={styles.fieldIcon} size={18} aria-hidden="true" />}
      <input aria-label={props.placeholder} aria-invalid={error || undefined} type={isPassword && visible ? "text" : type} {...props} />
      {isPassword && <RevealButton visible={visible} onToggle={() => setVisible(!visible)} />}
    </label>
  );
}

function RevealButton({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={styles.reveal} onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
      {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}

type ControlVariant = "default" | "tinted" | "plain";

const controlVariant: Record<ControlVariant, string | undefined> = {
  default: undefined,
  tinted: styles.controlTinted,
  plain: styles.controlPlain,
};

export function TextControl({ variant = "default", className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { variant?: ControlVariant }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <div className={cx(styles.control, controlVariant[variant], props.readOnly && styles.controlReadOnly, className)}>
      <input type={isPassword && visible ? "text" : type} {...props} />
      {isPassword && <RevealButton visible={visible} onToggle={() => setVisible(!visible)} />}
    </div>
  );
}

export function SelectControl({
  value,
  onChange,
  options,
  placeholder,
  variant = "default",
  required,
  name,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | readonly { value: string; label: string }[];
  placeholder: string;
  variant?: ControlVariant;
  required?: boolean;
  name?: string;
}) {
  return (
    <div className={cx(styles.control, controlVariant[variant])}>
      <select
        name={name}
        value={value}
        required={required}
        className={value ? undefined : styles.placeholder}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
      <CaretDown weight="bold" className={styles.chevron} size={18} aria-hidden="true" />
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cx(styles.toggle, checked && styles.toggleOn)}
      onClick={() => onChange(!checked)}
    />
  );
}

/* ---------- Feedback ---------- */

export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.alert} role="alert">
      <Warning className={styles.alertIcon} size={20} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <p className={styles.notice} role="status">{children}</p>;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <section className={cx(styles.cardTinted, styles.empty)}>
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </section>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.loading} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => <span key={index} className={styles.skeleton} />)}
    </div>
  );
}

/* ---------- Pills, tags, avatars ---------- */

export function StatusPill({ status }: { status: DisplayStatus }) {
  const muted = status === "cancelled" || status === "declined" || status === "expired";
  return <span className={cx(styles.statusPill, muted && styles.statusPillMuted)}><i />{statusLabel[status]}</span>;
}

/** Critical / Urgent / Standard marker for blood requests. */
export function UrgencyBadge({ urgency = "standard", compact = false }: { urgency?: Urgency; compact?: boolean }) {
  return (
    <span className={cx(styles.urgency, styles[`urgency_${urgency}`], compact && styles.urgencyCompact)}>
      {urgencyInfo[urgency].label}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}

export function Badge({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return <span className={cx(styles.badge, muted && styles.badgeMuted)}>{children}</span>;
}

export function InitialsAvatar({ name, size = 48, unread = false }: { name: string; size?: number; unread?: boolean }) {
  return (
    <span className={styles.initials} style={{ width: size, height: size, borderRadius: size / 2, fontSize: Math.round(size * (size >= 48 ? 0.36 : 0.36)) }} aria-hidden="true">
      {initials(name)}
      {unread && <i className={styles.avatarDot} />}
    </span>
  );
}

/** Round profile photo with a fallback user icon (Profile, Edit Profile, Donor Profile). */
export function ProfilePhoto({ src, size, ring }: { src?: string | null; size: number; ring?: "white" | "tinted" }) {
  return (
    <span
      className={styles.photoCircle}
      style={{
        width: size,
        height: size,
        border: ring === "white" ? "4px solid var(--surface-raised)" : ring === "tinted" ? "1px solid var(--border-tinted)" : undefined,
      }}
    >
      {src
        ? <Image className={styles.photo} src={src} alt="Profile photo" fill sizes={`${size}px`} unoptimized />
        : (
          <span className={styles.photoFallback} style={{ width: size * 0.42, height: size * 0.42 }}>
            <User size={Math.round(size * 0.24)} aria-hidden="true" />
          </span>
        )}
    </span>
  );
}

/* ---------- Menu rows ---------- */

export function MenuRow({
  href,
  onClick,
  icon,
  label,
  description,
  trailing,
  muted = false,
}: {
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  muted?: boolean;
}) {
  const content = (
    <>
      <span className={styles.menuRowLabel}>
        {icon}
        {description ? <span className={styles.menuRowText}>{label}<small>{description}</small></span> : <span>{label}</span>}
      </span>
      {trailing ?? <CaretRight weight="bold" className={styles.rowChevron} size={20} aria-hidden="true" />}
    </>
  );
  const className = cx(styles.cardTinted, styles.menuRow, icon ? styles.menuRowWithIcon : undefined, muted && styles.menuRowMuted);
  if (href) return <Link href={href} className={className}>{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={className}>{content}</button>;
  return <div className={className}>{content}</div>;
}

/* ---------- Status screens ---------- */

const statusIcons: Record<"success" | "available" | "declined" | "unavailable", { icon: PhosphorIcon; tone: "solid" | "soft" }> = {
  // On brand: a blood drop holding a life-saving symbol, not a generic check or cross.
  success: { icon: Heartbeat, tone: "solid" },
  available: { icon: HandHeart, tone: "soft" },
  declined: { icon: HeartBreak, tone: "soft" },
  unavailable: { icon: Hourglass, tone: "soft" },
};

/** Result badge for success / declined / availability screens: a glowing blood drop with one bold icon. */
export function StatusIcon({ kind }: { kind: keyof typeof statusIcons }) {
  const { icon: StatusGlyph, tone } = statusIcons[kind];
  return (
    <span className={cx(styles.statusIcon, styles.statusPop, tone === "solid" ? styles.statusSolid : styles.statusSoft)} aria-hidden="true">
      <span className={styles.statusHalo} />
      <span className={styles.statusDisc}>
        <StatusGlyph className={styles.statusGlyph} size={76} weight={tone === "solid" ? "bold" : "duotone"} />
      </span>
    </span>
  );
}

export function StatusScreen({
  icon,
  title,
  message,
  note,
  back = false,
  above,
  actions,
}: {
  icon: React.ComponentProps<typeof StatusIcon>["kind"];
  title: string;
  message: React.ReactNode;
  note?: string;
  back?: boolean | string;
  /** Shown above the result, e.g. a progress indicator. */
  above?: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <Screen footer={actions}>
      {back ? <BackButton href={typeof back === "string" ? back : undefined} /> : null}
      {above}
      <section className={styles.statusBody}>
        <StatusIcon kind={icon} />
        <div className={styles.statusCopy}>
          <h1 className={styles.heroTitle}>{title}</h1>
          <p className={styles.intro}>{message}</p>
          {note && <p className={styles.statusNote}>{note}</p>}
        </div>
      </section>
    </Screen>
  );
}
