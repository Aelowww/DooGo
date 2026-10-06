"use client";

import { Suspense, useEffect, useState } from "react";
import { BellRinging, CalendarBlank, CaretRight, ChatsCircle, Drop, HandHeart, Heartbeat, Hospital, MagnifyingGlass, MapPin, Plus, ShareNetwork, ShieldCheck, ToggleRight } from "@phosphor-icons/react";
import { timeAgo, todayISO } from "@/lib/format";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EngageEmpty } from "@/app/mobile/_components/engage-empty";
import { useSession } from "@/app/mobile/_components/session";
import { Heading, ListSkeleton, Screen, StatusPill, UrgencyBadge, buttonClass, cx, uiStyles } from "@/app/mobile/_components/ui";
import { canDonateTo, hasMedicalRecord } from "@/lib/blood";
import { byUrgency, displayStatus, subscribeRequests, type BloodRequest, type DisplayStatus } from "@/lib/requests";
import styles from "./page.module.css";

type Tab = "sent" | "received";

export default function RequestsPage() {
  return (
    <Suspense fallback={<Screen nav="requests"><ListSkeleton /></Screen>}>
      <ManageRequests />
    </Suspense>
  );
}

function ManageRequests() {
  const { user } = useSession();
  const tab: Tab = useSearchParams().get("tab") === "received" ? "received" : "sent";
  const [lists, setLists] = useState<Record<Tab, BloodRequest[] | null>>({ sent: null, received: null });

  useEffect(() => {
    const stopSent = subscribeRequests("requesterId", user.uid, (sent) => setLists((current) => ({ ...current, sent })), () => setLists((current) => ({ ...current, sent: [] })));
    const stopReceived = subscribeRequests("donorId", user.uid, (received) => setLists((current) => ({ ...current, received })), () => setLists((current) => ({ ...current, received: [] })));
    return () => {
      stopSent();
      stopReceived();
    };
  }, [user.uid]);

  // Received: open requests first, most urgent on top. Sent: newest first.
  const items = tab === "received" && lists.received
    ? [...lists.received].sort((a, b) => Number(displayStatus(b) === "pending") - Number(displayStatus(a) === "pending") || byUrgency(a, b))
    : lists[tab];
  const pendingReceived = lists.received?.filter((item) => displayStatus(item) === "pending").length ?? 0;

  return (
    <Screen nav="requests" wide>
      <div className={styles.titleRow}>
        <Heading title="Requests" />
        <Link href="/request-blood" className={buttonClass("primary", "small")}>
          <Plus size={16} weight="bold" aria-hidden="true" /> New request
        </Link>
      </div>
      <nav className={styles.tabs} aria-label="Request lists">
        <Link href="/requests" replace className={cx(styles.tab, tab === "sent" && styles.tabActive)} aria-current={tab === "sent" ? "page" : undefined}>
          <span>Sent</span>
        </Link>
        <Link href="/requests?tab=received" replace className={cx(styles.tab, tab === "received" && styles.tabActive)} aria-current={tab === "received" ? "page" : undefined}>
          <span>Received{pendingReceived > 0 && <b className={styles.count}>{pendingReceived}</b>}</span>
        </Link>
      </nav>
      {items === null
        ? <ListSkeleton />
        : items.length === 0
          ? tab === "sent"
            ? <SentEmpty />
            : <ReceivedEmpty />
          : (
            <div className={cx(uiStyles.list, styles.cards)}>
              {items.map((request) => <RequestCard key={request.id} request={request} tab={tab} />)}
            </div>
          )}
    </Screen>
  );
}

/** "Needed today", "Needed in 3 days", "Needed Oct 20" — clearer than a numeric date. */
function neededLabel(neededBy: string, today = todayISO()) {
  const days = Math.round((new Date(`${neededBy}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000);
  const short = new Date(`${neededBy}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days < 0) return `Was needed ${short}`;
  if (days === 0) return "Needed today";
  if (days === 1) return "Needed tomorrow";
  if (days <= 6) return `Needed in ${days} days`;
  return `Needed ${short}`;
}

/** What happens next, in plain words, from this user's side. */
function nextStep(status: DisplayStatus, tab: Tab, first: string) {
  if (tab === "sent") {
    return {
      pending: `Waiting for ${first} to respond`,
      accepted: `${first} agreed to donate. Set a time in Messages`,
      completed: `${first} donated. Thank them!`,
      declined: `${first} can't help this time. Try another donor`,
      cancelled: "You cancelled this request",
      expired: "No one accepted before the needed-by date",
    }[status];
  }
  return {
    pending: "Waiting for your answer",
    accepted: "You agreed to donate. Set a time in Messages",
    completed: "You donated. Thank you!",
    declined: "You declined this request",
    cancelled: "They cancelled this request",
    expired: "This request expired",
  }[status];
}

/** One request: the person, what blood they need, how much, where, and when. The whole card opens the details. */
function RequestCard({ request, tab }: { request: BloodRequest; tab: Tab }) {
  const name = tab === "sent" ? request.donorName : request.requesterName;
  const status = displayStatus(request);
  const open = status === "pending";
  const bags = `${request.quantity} bag${request.quantity === 1 ? "" : "s"}`;
  const badge = tab === "received" && open ? <UrgencyBadge urgency={request.urgency} compact /> : <StatusPill status={status} />;
  return (
    <Link href={`/requests/${request.id}`} className={cx(uiStyles.card, styles.card, !open && tab === "received" && styles.closed)}>
      <span className={styles.type} aria-label={`Blood type ${request.bloodType}`}>{request.bloodType}</span>
      <span className={styles.meta}>
        <span className={styles.who}>
          <strong>{name}</strong>
          <small>{tab === "sent" ? "Donor" : "Requester"}</small>
          {/* Phones: status sits beside the name so the details get the full width. */}
          <span className={styles.badgeInline}>{badge}</span>
        </span>
        <span className={styles.facts}>
          <span><Drop size={14} weight="fill" /> {bags}</span>
          <span><Hospital size={14} weight="fill" /> {request.hospital || request.location}</span>
          {request.neededBy && <span><CalendarBlank size={14} weight="fill" /> {neededLabel(request.neededBy)}</span>}
        </span>
        <small className={styles.when}>{nextStep(status, tab, name.split(" ")[0])} · {timeAgo(request.createdAt)}</small>
      </span>
      <span className={styles.side}>
        {badge}
        <CaretRight className={styles.chevron} size={18} weight="bold" aria-hidden="true" />
      </span>
    </Link>
  );
}

function SentEmpty() {
  return (
    <EngageEmpty
      icon={Drop}
      orbit={[MagnifyingGlass, ChatsCircle, Heartbeat]}
      eyebrow="Need blood?"
      title="We'll find donors for you"
      body="Tell us the blood type and hospital. DooGo matches you with compatible donors nearby who are ready to help."
      primary={{ label: "Request Blood", href: "/request-blood", icon: Drop }}
      steps={[
        { title: "Tell us what you need", body: "Blood type, bags, hospital, and how urgent it is." },
        { title: "We match donors", body: "Only compatible, available, eligible donors near you." },
        { title: "Chat and coordinate", body: "Once a donor accepts, agree on a time in Messages." },
      ]}
    />
  );
}

function ReceivedEmpty() {
  const { profile } = useSession();
  const setUp = Boolean(profile.bloodType && profile.location && hasMedicalRecord(profile));

  async function invite() {
    const text = "I'm a blood donor on DooGo. Join me and help people near you who need blood.";
    const url = window.location.origin;
    try {
      if (navigator.share) await navigator.share({ title: "DooGo", text, url });
      else await navigator.clipboard.writeText(`${text} ${url}`);
    } catch {
      // The user closed the share sheet; nothing to do.
    }
  }

  if (!setUp) {
    return (
      <EngageEmpty
        icon={HandHeart}
        orbit={[Drop, ShieldCheck, Heartbeat]}
        eyebrow="Be someone's hero"
        title="Become a donor and save lives"
        body="One donation can help up to three people. Set up your donor profile so people nearby who need your blood type can reach you."
        primary={{ label: "Become a donor", href: "/donate/setup", icon: HandHeart }}
        steps={[
          { title: "Add your blood type", body: "And the city where you can donate." },
          { title: "Upload a medical record", body: "A blood typing result or medical certificate. The hospital does the rest." },
          { title: "Get matched", body: "We'll notify you when someone compatible needs help." },
        ]}
      />
    );
  }

  if (!profile.available) {
    return (
      <EngageEmpty
        icon={ToggleRight}
        orbit={[BellRinging, Drop]}
        eyebrow="You're hidden"
        title="Turn on availability to get requests"
        body="Your donor profile is ready, but you're not visible in donor searches right now."
        primary={{ label: "Become available", href: "/donate", icon: ToggleRight }}
      />
    );
  }

  const helps = canDonateTo(profile.bloodType!).join(", ");
  return (
    <EngageEmpty
      icon={BellRinging}
      orbit={[MapPin, Drop, Heartbeat]}
      eyebrow="You're on standby"
      title="We'll alert you when you're needed"
      body={<>As <strong>{profile.bloodType}</strong> in <strong>{profile.location}</strong>, you can help people with {helps} blood. Requests appear here the moment someone nearby needs you.</>}
      primary={{ label: "Invite a friend to donate", onClick: invite, icon: ShareNetwork }}
      secondary={{ label: "Manage availability", href: "/donate" }}
    />
  );
}
