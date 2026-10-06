"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, EmptyState, Heading, ListSkeleton, Screen, StatusPill, UrgencyBadge, cx, uiStyles } from "@/app/mobile/_components/ui";
import { acceptBlocker, hasMedicalRecord, nextEligibleDate, unitMl } from "@/lib/blood";
import { formatLongDate, formatShortDate, shortName, timeAgo, todayISO } from "@/lib/format";
import { openConversation } from "@/lib/messages";
import { isCovered, subscribeNeed, type Need } from "@/lib/needs";
import { acceptAndConnect, cancelRequest, completeRequest, displayStatus, findActiveCommitment, releaseRequestsDuringRecovery, respondToRequest, statusLabel, subscribeRequest, type BloodRequest } from "@/lib/requests";
import { recordDonation } from "@/lib/users";
import styles from "./page.module.css";

export default function RequestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, profile } = useSession();
  const [request, setRequest] = useState<BloodRequest | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => subscribeRequest(id, setRequest, () => setRequest(null)), [id]);

  // Shared progress (bags pledged / donated) for the request this one belongs to.
  const needId = request?.needId;
  const [need, setNeed] = useState<Need | null>(null);
  useEffect(() => (needId ? subscribeNeed(needId, setNeed) : undefined), [needId]);

  // A donor can only be committed to one donation at a time.
  const awaitingAnswer = Boolean(request && request.donorId === user.uid && request.status === "pending");
  const [commitment, setCommitment] = useState<BloodRequest | null>(null);
  useEffect(() => {
    if (!awaitingAnswer) return;
    let active = true;
    findActiveCommitment(user.uid).then((found) => active && setCommitment(found)).catch(() => {});
    return () => {
      active = false;
    };
  }, [awaitingAnswer, user.uid]);

  if (request === undefined) return <Screen nav="requests"><BackButton href="/requests" /><ListSkeleton count={2} /></Screen>;
  if (request === null) {
    return (
      <Screen nav="requests">
        <BackButton href="/requests" />
        <EmptyState title="Request not found" description="It may have been removed, or you don't have access to it." />
      </Screen>
    );
  }

  const current = request;
  const received = current.donorId === user.uid;
  const otherName = received ? current.requesterName : current.donorName;

  async function run(action: () => Promise<void>, failure: string) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (caught) {
      // Another donor may have filled the last bag while this one was deciding.
      setError(caught instanceof Error && caught.message === "covered" ? "Enough donors agreed to this request while you were deciding. Thank you for being ready to help!" : failure);
      setBusy(false);
    }
  }

  const respond = (status: "accepted" | "declined") => run(async () => {
    const name = encodeURIComponent(current.requesterName);
    if (status === "accepted") {
      const chat = await acceptAndConnect(current);
      router.replace(`/requests/${current.id}/accepted?name=${name}&chat=${chat}`);
    } else {
      await respondToRequest(current, "declined");
      router.replace(`/requests/${current.id}/declined?name=${name}`);
    }
  }, "We couldn't update this request. Please try again.");

  const markDonated = () => run(async () => {
    await completeRequest(current);
    await recordDonation(profile);
    // Other pending requests that need blood before this donor recovers go back to their seekers.
    await releaseRequestsDuringRecovery(user.uid, todayISO(nextEligibleDate(todayISO(), profile.gender))).catch(() => {});
    setBusy(false);
  }, "We couldn't record your donation. Please try again.");

  const cancel = () => run(async () => {
    await cancelRequest(current);
    setBusy(false);
  }, "We couldn't cancel this request. Please try again.");

  const message = () => run(async () => {
    const otherId = received ? current.requesterId : current.donorId;
    const conversation = await openConversation({ uid: user.uid, name: shortName(profile.fullName) }, { uid: otherId, name: otherName });
    router.push(`/messages/${conversation}`);
  }, "We couldn't open the chat. Please try again.");

  const status = displayStatus(current);
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Urgency:", value: <UrgencyBadge urgency={current.urgency} /> },
    { label: "Blood Type:", value: current.bloodType },
    { label: "Quantity:", value: `${current.quantity} bag${current.quantity === 1 ? "" : "s"}` },
    ...(current.hospital ? [{ label: "Hospital:", value: current.hospital }] : []),
    { label: "Location:", value: current.location },
    { label: "Reason:", value: current.reason || "—" },
    { label: received ? "Requested by:" : "Requested to:", value: otherName },
    { label: "Date:", value: formatShortDate(current.createdAt) },
    ...(current.neededBy ? [{ label: "Needed by:", value: formatShortDate(current.neededBy) }] : []),
  ];

  // Compatibility, coverage, one commitment at a time, medical record, and recovery time.
  const blocker = received && status === "pending"
    ? acceptBlocker(profile, current, { commitment: commitment && commitment.id !== current.id ? commitment : null, covered: isCovered(need) })
    : null;

  const messageButton = <Button variant="outline" size="compact" onClick={message} disabled={busy}>Message {otherName}</Button>;

  if (received) {
    return (
      <Screen nav="requests" gap={16}>
        <BackButton href="/requests?tab=received" />
        <Heading title="Request Details" subtitle="Received Request" />
        <Timeline request={current} />
        <Units request={current} need={need} received />
        <dl className={cx(uiStyles.cardTinted, styles.details, styles.detailsStrong)}>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        {error && <Alert>{error}</Alert>}
        {status === "pending" && blocker && (
          <div className={styles.blocker} role="status">
            <strong>You can&apos;t accept this yet</strong>
            <p>{blocker}</p>
            {!hasMedicalRecord(profile) && <Link href="/donate/setup">Add your medical record</Link>}
          </div>
        )}
        {status === "pending" && (
          <div className={styles.actions}>
            <Button size="compact" onClick={() => respond("accepted")} disabled={busy || Boolean(blocker)}>Accept</Button>
            <Button variant="ghost" size="compact" onClick={() => respond("declined")} disabled={busy}>Decline</Button>
          </div>
        )}
        {status === "expired" && current.neededBy && (
          <p className={styles.expired}>This request expired on {formatLongDate(current.neededBy)} and can no longer be accepted.</p>
        )}
        {status !== "pending" && <StatusRow request={current} />}
        {current.status === "accepted" && (
          <div className={styles.actions}>
            <Button size="compact" onClick={markDonated} disabled={busy}>Mark as Donated</Button>
            {messageButton}
          </div>
        )}
        {current.status === "completed" && <div className={styles.actions}>{messageButton}</div>}
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton href="/requests" />
      <Heading eyebrow="Sent Request" title="Request Details" />
      <Timeline request={current} />
      <Units request={current} need={need} />
      <dl className={cx(uiStyles.cardTinted, styles.details)}>
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <StatusRow request={current} />
      {status === "expired" && <p className={styles.expired}>No donor accepted before the needed-by date. You can send a new request from Home.</p>}
      {error && <Alert>{error}</Alert>}
      {current.status === "pending" && <Button variant="ghost" size="compact" onClick={cancel} disabled={busy}>Cancel Request</Button>}
      {(current.status === "accepted" || current.status === "completed") && messageButton}
    </Screen>
  );
}

/** One donor gives one unit: how many of the bags are pledged and donated so far. */
function Units({ request, need, received = false }: { request: BloodRequest; need: Need | null; received?: boolean }) {
  const quantity = need?.quantity ?? request.quantity;
  const pledged = Math.min(quantity, need?.pledged ?? (request.status === "accepted" || request.status === "completed" ? 1 : 0));
  const donated = Math.min(quantity, need?.donated ?? (request.status === "completed" ? 1 : 0));
  const plural = quantity === 1 ? "" : "s";
  return (
    <section className={cx(uiStyles.card, styles.units)} aria-label="Bags">
      <header>
        <strong>{donated} of {quantity} bag{plural} donated</strong>
        <small>{pledged} of {quantity} donor{plural} agreed</small>
      </header>
      <div className={styles.bags} aria-hidden="true">
        {Array.from({ length: quantity }, (_, index) => (
          <i key={index} className={index < donated ? styles.bagDonated : index < pledged ? styles.bagPledged : undefined} />
        ))}
      </div>
      <p>
        {received
          ? `Each donor gives one unit (about ${unitMl} ml). If you accept, you cover 1 of the ${quantity}.`
          : quantity > 1
            ? `Each donor gives one unit, so this needs ${quantity} donors. If not enough agree, ask more donors from Home.`
            : `One donor gives one unit (about ${unitMl} ml).`}
      </p>
    </section>
  );
}

function StatusRow({ request }: { request: BloodRequest }) {
  return (
    <div className={cx(uiStyles.card, styles.statusRow)}>
      <span>Status</span>
      <StatusPill status={displayStatus(request)} />
    </div>
  );
}

/** Sent → Accepted → Donated, with the moment each step happened. */
function Timeline({ request }: { request: BloodRequest }) {
  const status = displayStatus(request);
  const ended = status === "declined" || status === "cancelled" || status === "expired";
  const steps = [
    { label: "Sent", at: request.createdAt, done: true },
    {
      label: ended ? statusLabel[status] : "Accepted",
      at: request.respondedAt,
      done: status === "accepted" || status === "completed" || ended,
      failed: ended,
    },
    { label: "Donated", at: request.completedAt, done: status === "completed" },
  ];
  return (
    <ol className={styles.timeline}>
      {steps.map((step, index) => {
        const current = !step.done && (index === 0 || steps[index - 1].done) && !ended;
        return (
          <li key={step.label} className={cx(step.done && styles.done, step.failed && styles.failed, current && styles.current)}>
            <span className={styles.dot} aria-hidden="true" />
            <strong>{step.label}</strong>
            <small>{step.done && step.at ? timeAgo(step.at) : current ? "Waiting" : ""}</small>
          </li>
        );
      })}
    </ol>
  );
}
