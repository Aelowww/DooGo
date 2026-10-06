"use client";

import { CalendarCheck, CaretRight, ClockCounterClockwise, Drop, Hourglass, MapPin, PencilSimple, SealCheck, Warning } from "@phosphor-icons/react";
import { useState } from "react";
import { useToast } from "@/app/_components/toast";
import Link from "next/link";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Heading, IconWell, Screen, Toggle, cx } from "@/app/mobile/_components/ui";
import { canDonateTo, hasMedicalRecord, intervalLabel, isEligibleToDonate, nextEligibleDate } from "@/lib/blood";
import { formatLongDate, todayISO } from "@/lib/format";
import { notify } from "@/lib/notifications";
import { updateUserProfile } from "@/lib/users";
import styles from "./page.module.css";

/** Everything about being a donor on one page: availability, eligibility, and donor details. */
export default function DonatePage() {
  const { user, profile } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const recordOnFile = hasMedicalRecord(profile);
  const missing = [
    !profile.bloodType && "your blood type",
    !profile.location && "your city",
    !recordOnFile && "a medical record",
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;
  const eligible = isEligibleToDonate(profile.lastDonation, new Date(), profile.gender);

  async function setAvailable(available: boolean) {
    setBusy(true);
    setError("");
    try {
      await updateUserProfile(profile, { available });
      toast(available ? "You're available" : "Availability turned off", { body: available ? "People who need your blood type can now find you." : "You won't appear in donor searches until you turn it back on." });
      await notify({
        userId: user.uid,
        actorId: user.uid,
        type: "status",
        title: available ? "You're now visible to people who need blood" : "You're hidden from donor searches for now",
        link: "/donate",
      });
    } catch {
      setError("We couldn't update your availability. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen gap={20}>
      <BackButton href="/home" />
      <Heading title="Donating" subtitle="Your availability, eligibility, and donor details" />
      {error && <Alert>{error}</Alert>}

      {/* Availability */}
      <section className={cx(styles.card, profile.available && ready && styles.cardOn)}>
        <div className={styles.toggleRow}>
          <span>
            <strong>{profile.available && ready ? "You're available" : "You're not available"}</strong>
            <small>
              {ready
                ? profile.available
                  ? "People who need your blood type can find and ask you."
                  : "Turn this on so people nearby can find you."
                : `Add ${missing.join(", ").replace(/, ([^,]*)$/, " and $1")} to become available.`}
            </small>
          </span>
          <Toggle checked={profile.available && ready} onChange={(next) => !busy && ready && setAvailable(next)} label="Available to donate" />
        </div>
        {!ready && (
          <Link href="/donate/setup" className={styles.cta}>
            Complete donor details <CaretRight size={14} weight="bold" />
          </Link>
        )}
      </section>

      {/* Eligibility */}
      <section className={styles.card}>
        <div className={styles.row}>
          <IconWell icon={eligible ? CalendarCheck : Hourglass} size={44} round />
          <span>
            <strong>{eligible ? "Ready to donate" : `Recovering until ${formatLongDate(todayISO(nextEligibleDate(profile.lastDonation!, profile.gender)))}`}</strong>
            <small>
              {profile.lastDonation ? `Last donation: ${formatLongDate(profile.lastDonation)}. ` : "No donations recorded yet. "}
              You can give whole blood every {intervalLabel(profile.gender)}.
            </small>
          </span>
        </div>
      </section>

      {/* Donor details */}
      <section className={styles.card}>
        <header className={styles.cardHead}>
          <h2>Donor details</h2>
          <Link href="/donate/setup" className={styles.edit}><PencilSimple size={14} weight="bold" /> Edit</Link>
        </header>
        <dl className={styles.details}>
          <div>
            <dt><Drop size={16} weight="fill" /> Blood type</dt>
            <dd>{profile.bloodType ?? <Missing />}</dd>
          </div>
          <div>
            <dt><MapPin size={16} weight="fill" /> City</dt>
            <dd>{profile.location ?? <Missing />}</dd>
          </div>
          <div>
            <dt><SealCheck size={16} weight="fill" /> Medical record</dt>
            <dd>{recordOnFile ? `${profile.medicalRecord!.kind}, ${profile.medicalRecord!.issuer}` : <Missing />}</dd>
          </div>
        </dl>
        {profile.bloodType && (
          <p className={styles.note}>As {profile.bloodType}, you can give to {canDonateTo(profile.bloodType).join(", ")}.</p>
        )}
      </section>

      <Link href="/profile/donations" className={cx(styles.card, styles.link)}>
        <IconWell icon={ClockCounterClockwise} size={44} round />
        <span>
          <strong>Donation history</strong>
          <small>{profile.totalDonations} donation{profile.totalDonations === 1 ? "" : "s"} recorded</small>
        </span>
        <CaretRight size={18} weight="bold" className={styles.chevron} />
      </Link>
    </Screen>
  );
}

function Missing() {
  return <span className={styles.missing}><Warning size={14} weight="fill" /> Not added</span>;
}
