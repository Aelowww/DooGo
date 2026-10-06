"use client";

import {
  ArrowRight,
  CaretRight,
  ChatCircleDots,
  Check,
  Crown,
  Drop,
  DropHalfBottom,
  FirstAidKit,
  HandHeart,
  Heartbeat,
  Lightbulb,
  Lock,
  MapPin,
  Medal,
  PaperPlaneTilt,
  SealCheck,
  Star,
  Trophy,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useBadges } from "@/app/mobile/_components/badges";
import { useLayout } from "@/app/mobile/_components/contexts";
import { useSession } from "@/app/mobile/_components/session";
import { IconWell, Screen, cx } from "@/app/mobile/_components/ui";
import { bloodTypes, canDonateTo, compatibleDonorTypes, donationIntervalDays, hasMedicalRecord, type BloodType } from "@/lib/blood";
import { toDate, todayISO } from "@/lib/format";
import { byUrgency, displayStatus, subscribeRequests, type BloodRequest } from "@/lib/requests";
import { countOpenNeeds } from "@/lib/needs";
import { countDonorsByType, type UserProfile } from "@/lib/users";
import styles from "./page.module.css";

type DonorCounts = Partial<Record<BloodType, number>>;

/** Each whole-blood donation can be separated into components that help up to three patients. */
const livesPerDonation = 3;

const tips = [
  { title: "Hydrate before you donate", body: "Drink an extra 500 ml of water in the hours before donating. It keeps your blood pressure steady and speeds recovery." },
  { title: "Eat iron-rich meals", body: "Leafy greens, beans, and lean meat help rebuild your iron. Pair them with vitamin C for better absorption." },
  { title: "Bring the patient's details", body: "When requesting blood, have the patient's full name, ward, and blood type ready for the blood bank." },
  { title: "Bring a valid ID", body: "Hospitals and blood banks confirm every donor's identity before screening, so keep an ID with you." },
  { title: "Ask about replacement donors", body: "Some hospitals ask families to bring replacement donors. Requesting early gives donors time to arrange." },
];

/** Progress through the recovery window after the last donation (12 or 16 weeks). */
function recovery(lastDonation: string | null, gender?: string | null) {
  const interval = donationIntervalDays(gender);
  if (!lastDonation) return { progress: 1, daysLeft: 0 };
  const last = toDate(lastDonation)!;
  const days = Math.floor((Date.now() - last.getTime()) / 86_400_000);
  return { progress: Math.min(1, Math.max(0, days / interval)), daysLeft: Math.max(0, interval - days) };
}

export default function HomePage() {
  const { user, profile } = useSession();
  const badges = useBadges();
  // Phones get a shorter dashboard; the detailed panels are desktop-only.
  const layout = useLayout();
  const [sent, setSent] = useState<BloodRequest[] | null>(null);
  const [received, setReceived] = useState<BloodRequest[] | null>(null);

  useEffect(() => subscribeRequests("requesterId", user.uid, setSent, () => setSent([])), [user.uid]);
  useEffect(() => subscribeRequests("donorId", user.uid, setReceived, () => setReceived([])), [user.uid]);

  // Available donors per blood type in the user's city; shared by the hero and "Donors near you".
  const [counts, setCounts] = useState<DonorCounts | null>(null);
  useEffect(() => {
    if (!profile.location) return;
    let active = true;
    countDonorsByType(profile.location, user.uid).then((result) => active && setCounts(result)).catch(() => active && setCounts({}));
    return () => {
      active = false;
    };
  }, [profile.location, user.uid]);
  const availableNearby = counts ? Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0) : null;

  // Open blood requests in the same city, so the headline shows both sides.
  const [openNearby, setOpenNearby] = useState<number | null>(null);
  useEffect(() => {
    if (!profile.location) return;
    let active = true;
    // On failure keep null ("–") rather than claiming zero requests.
    countOpenNeeds(profile.location).then((count) => active && setOpenNearby(count)).catch(() => {});
    return () => {
      active = false;
    };
  }, [profile.location]);

  const incoming = (received ?? []).filter((request) => displayStatus(request) === "pending").sort(byUrgency);
  const open = (sent ?? []).filter((request) => ["pending", "accepted"].includes(displayStatus(request)));

  return (
    <Screen nav="home" wide gap={20} className={layout === "mobile" ? "phone-dashboard" : undefined}>

      <Hero profile={profile} donors={availableNearby} requests={openNearby} />

      <div className={styles.stats}>
        <Stat tone="amber" icon={PaperPlaneTilt} value={open.length} label="Open requests" href="/requests" />
        <Stat tone="red" icon={HandHeart} value={incoming.length} label="Requests for you" href="/requests?tab=received" />
        <Stat tone="rose" icon={DropHalfBottom} value={profile.totalDonations} label="Donations" href="/profile/donations" />
        <Stat tone="slate" icon={ChatCircleDots} value={badges.messages} label="Unread chats" href="/messages" />
      </div>

      <div className={styles.grid}>
        <div className={styles.mainColumn}>
          {profile.location && <CommunityPulse location={profile.location} myType={profile.bloodType} counts={counts} />}
          <div className={styles.pair}>
            <Compatibility bloodType={profile.bloodType} />
            <Tip />
          </div>
        </div>

        <aside className={styles.rail}>
          <DonorStatus profile={profile} />
          <Milestones donations={profile.totalDonations} />
        </aside>
      </div>
    </Screen>
  );
}

/** The user's blood card: their type front and center, like a donor ID. */
function BloodCard({ profile }: { profile: UserProfile }) {
  const { bloodType, location, available } = profile;
  const verified = hasMedicalRecord(profile);
  const { daysLeft } = recovery(profile.lastDonation, profile.gender);
  const status = !bloodType
    ? "Blood type not set"
    : !verified
      ? "Not a donor yet"
      : daysLeft > 0
        ? `Can donate again in ${daysLeft} days`
        : available ? "Ready to donate" : "Donation paused";

  return (
    <Link href={bloodType ? "/profile" : "/donate/setup"} className={styles.card}>
      <Drop className={styles.cardMark} size={220} weight="fill" aria-hidden="true" />
      <span className={styles.cardTop}>
        <span className={styles.cardBrand}><Drop size={16} weight="fill" /> DooGo</span>
        {verified && <span className={styles.cardBadge}><SealCheck size={14} weight="fill" /> Verified</span>}
      </span>
      <span className={styles.cardType}>
        <small>Blood type</small>
        <strong>{bloodType ?? "—"}</strong>
      </span>
      <span className={styles.cardBottom}>
        <span>
          <strong>{profile.fullName || "Your name"}</strong>
          <small><MapPin size={12} weight="fill" /> {location ?? "City not set"}</small>
        </span>
        <span className={cx(styles.cardStatus, available && verified && daysLeft === 0 && styles.cardLive)}>{status}</span>
      </span>
    </Link>
  );
}

/** Both sides of the city at a glance — donors available and blood requested — plus two equal paths. */
function Hero({ profile, donors, requests }: { profile: UserProfile; donors: number | null; requests: number | null }) {
  const city = profile.location;
  return (
    <section className={styles.top}>
      <BloodCard profile={profile} />
      <div className={styles.live}>
        <span className={styles.liveTag}><i /> Live{city ? ` · ${city}` : ""}</span>
        <h1>{city ? `${city} right now` : "Set your city to see activity near you"}</h1>
        {city && (
          <div className={styles.balance}>
            <span>
              <strong>{donors ?? "–"}</strong>
              <small>{donors === 1 ? "donor" : "donors"} available</small>
            </span>
            <span>
              <strong>{requests ?? "–"}</strong>
              <small>blood {requests === 1 ? "request" : "requests"} open</small>
            </span>
          </div>
        )}
        <div className={styles.paths}>
          <Link href="/request-blood" className={styles.path}>
            <span className={styles.pathIcon}><FirstAidKit size={24} weight="duotone" /></span>
            <span>
              <strong>Request blood</strong>
              <small>Find compatible donors</small>
            </span>
            <ArrowRight className={styles.pathArrow} size={18} weight="bold" />
          </Link>
          <Link href="/donate" className={styles.path}>
            <span className={styles.pathIcon}><HandHeart size={24} weight="duotone" /></span>
            <span>
              <strong>Donate blood</strong>
              <small>{profile.available ? "Manage availability" : "Become a donor"}</small>
            </span>
            <ArrowRight className={styles.pathArrow} size={18} weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label, href, tone }: { icon: React.ComponentProps<typeof IconWell>["icon"]; value: number; label: string; href: string; tone: "red" | "rose" | "amber" | "slate" }) {
  return (
    <Link href={href} className={cx(styles.stat, styles[tone])}>
      <IconWell icon={icon} size={36} round />
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </Link>
  );
}

/** Donor side at a glance: recovery ring, availability, and whether the medical record is on file. */
function DonorStatus({ profile }: { profile: UserProfile }) {
  const { bloodType, location, available, lastDonation } = profile;
  const recordOnFile = hasMedicalRecord(profile);
  const { progress, daysLeft } = recovery(lastDonation, profile.gender);
  const ready = daysLeft === 0;
  const circumference = 2 * Math.PI * 40;
  const setUp = Boolean(bloodType && location && recordOnFile);

  return (
    <section className={cx(styles.panel, styles.donor)}>
      <header>
        <h2>Donor status</h2>
        <span className={cx(styles.dot, available && setUp ? styles.dotOn : styles.dotOff)}>{available && setUp ? "Available" : "Not available"}</span>
      </header>
      <div className={styles.donorBody}>
        <div className={styles.ring} role="img" aria-label={ready ? "Ready to donate" : `${daysLeft} days until you can donate again`}>
          <svg viewBox="0 0 96 96" width="96" height="96">
            <circle cx="48" cy="48" r="40" className={styles.ringTrack} />
            <circle cx="48" cy="48" r="40" className={styles.ringValue} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <span className={styles.ringCenter}>
            {bloodType ? <strong>{bloodType}</strong> : <Drop size={24} />}
            <small>{ready ? "Ready" : `${daysLeft}d left`}</small>
          </span>
        </div>
        <ul className={styles.checks}>
          <li className={bloodType ? styles.ok : undefined}>{bloodType ? <Check size={14} weight="bold" /> : <Warning size={14} weight="fill" />} Blood type {bloodType ?? "not set"}</li>
          <li className={location ? styles.ok : undefined}>{location ? <MapPin size={14} weight="fill" /> : <Warning size={14} weight="fill" />} {location ?? "City not set"}</li>
          <li className={recordOnFile ? styles.ok : undefined}>{recordOnFile ? <SealCheck size={14} weight="fill" /> : <Warning size={14} weight="fill" />} {recordOnFile ? "Medical record on file" : "Medical record needed"}</li>
        </ul>
      </div>
      <Link href={setUp ? "/donate" : "/donate/setup"} className={styles.donorLink}>
        {setUp ? (available ? "Manage availability" : "Become available") : "Finish donor setup"} <ArrowRight size={14} weight="bold" />
      </Link>
    </section>
  );
}

/** Live count of available donors per blood type in the user's city. */
function CommunityPulse({ location, myType, counts }: { location: string; myType: BloodType | null; counts: DonorCounts | null }) {
  const total = counts ? Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0) : 0;
  const max = counts ? Math.max(1, ...Object.values(counts).map((count) => count ?? 0)) : 1;

  return (
    <section className={styles.pulse}>
      <header>
        <span>
          <h2>Donors near you</h2>
          <small><MapPin size={13} weight="fill" /> {location} · {counts === null ? "…" : `${total} available now`}</small>
        </span>
        <IconWell icon={UsersThree} size={40} round />
      </header>
      <div className={styles.typeGrid}>
        {bloodTypes.map((type) => {
          const count = counts?.[type] ?? 0;
          const scarce = counts !== null && count <= 1;
          return (
            <div key={type} className={cx(styles.typeCell, scarce && styles.scarce, type === myType && styles.mine)}>
              <strong>{type}</strong>
              <span className={styles.bar}><i style={{ height: `${counts === null ? 0 : Math.max(8, (count / max) * 100)}%` }} /></span>
              <small>{counts === null ? "–" : count}</small>
            </div>
          );
        })}
      </div>
      <p className={styles.pulseNote}>
        <span className={styles.legendScarce} /> Low supply: these types have one donor or fewer nearby.
      </p>
    </section>
  );
}

const milestones = [
  { count: 1, title: "First Drop", icon: Drop },
  { count: 3, title: "Life Saver", icon: Heartbeat },
  { count: 5, title: "Hero", icon: Medal },
  { count: 10, title: "Legend", icon: Crown },
];

/** Donation badges with progress toward the next one. */
function Milestones({ donations }: { donations: number }) {
  const next = milestones.find((milestone) => donations < milestone.count);
  const previous = [...milestones].reverse().find((milestone) => donations >= milestone.count);
  const from = previous?.count ?? 0;
  const progress = next ? (donations - from) / (next.count - from) : 1;

  return (
    <section className={cx(styles.panel, styles.impact)}>
      <header>
        <h2>Your impact</h2>
        <Trophy size={22} weight="duotone" />
      </header>
      <div className={styles.badges}>
        {milestones.map((milestone) => {
          const earned = donations >= milestone.count;
          const BadgeIcon = earned ? milestone.icon : Lock;
          return (
            <div key={milestone.title} className={cx(styles.badge, earned && styles.earned)} title={`${milestone.title}: ${milestone.count} donation${milestone.count === 1 ? "" : "s"}`}>
              <span><BadgeIcon size={22} weight={earned ? "fill" : "duotone"} /></span>
              <small>{milestone.title}</small>
            </div>
          );
        })}
      </div>
      <div className={styles.nextBadge}>
        <div className={styles.progress}><i style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        <p>
          {next
            ? <><strong>{next.count - donations}</strong> more donation{next.count - donations === 1 ? "" : "s"} to unlock <strong>{next.title}</strong> · up to {donations * livesPerDonation} lives helped</>
            : <><Star size={14} weight="fill" /> You&apos;ve earned every badge. Thank you!</>}
        </p>
      </div>
    </section>
  );
}

function Compatibility({ bloodType }: { bloodType: BloodType | null }) {
  if (!bloodType) {
    return (
      <section className={cx(styles.panel, styles.compat)}>
        <h2>Blood compatibility</h2>
        <p className={styles.panelText}>Add your blood type to see who you can give to and receive from.</p>
        <Link href="/donate/setup" className={styles.inlineLink}>Add blood type <CaretRight size={14} weight="bold" /></Link>
      </section>
    );
  }
  const giveTo = canDonateTo(bloodType);
  const receiveFrom = compatibleDonorTypes(bloodType);
  return (
    <section className={cx(styles.panel, styles.compat)}>
      <h2>Blood compatibility <span className={styles.typeTag}>{bloodType}</span></h2>
      <div className={styles.compatGroup}>
        <small>You can receive from</small>
        <div className={styles.chips}>{receiveFrom.map((type) => <span key={type} className={cx(styles.chip, type === bloodType && styles.chipSelf)}>{type}</span>)}</div>
      </div>
      <div className={styles.compatGroup}>
        <small>You can give to</small>
        <div className={styles.chips}>{giveTo.map((type) => <span key={type} className={cx(styles.chip, type === bloodType && styles.chipSelf)}>{type}</span>)}</div>
      </div>
    </section>
  );
}

function Tip() {
  const day = Math.floor(new Date(`${todayISO()}T00:00:00`).getTime() / 86_400_000);
  const tip = tips[day % tips.length];
  return (
    <section className={cx(styles.panel, styles.tip)}>
      <IconWell icon={Lightbulb} size={36} round />
      <div>
        <small>Good to know</small>
        <strong>{tip.title}</strong>
        <p className={styles.panelText}>{tip.body}</p>
      </div>
    </section>
  );
}
