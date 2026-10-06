"use client";

import { PaperPlaneTilt } from "@phosphor-icons/react";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cityList, draftQuery, useRequestDraft } from "@/app/mobile/_components/request-params";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, ButtonLink, Steps, EmptyState, Heading, InitialsAvatar, ListSkeleton, ProfilePhoto, Screen, buttonClass, cx, uiStyles } from "@/app/mobile/_components/ui";
import { unitMl, urgencyInfo } from "@/lib/blood";
import { formatShortDate, shortName } from "@/lib/format";
import { createRequests } from "@/lib/requests";
import { isDonorEligible, searchDonors, type DonorProfile } from "@/lib/users";
import styles from "./page.module.css";

export default function DonorResultsPage() {
  return (
    <Suspense fallback={<Screen><ListSkeleton /></Screen>}>
      <DonorResults />
    </Suspense>
  );
}

/** "Request all" asks at most this many donors at once, so one request can't flood the community. */
const maxBroadcast = 10;

function DonorResults() {
  const router = useRouter();
  const { user, profile } = useSession();
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastError, setBroadcastError] = useState("");
  const draft = useRequestDraft();
  const [donors, setDonors] = useState<DonorProfile[] | null>(null);
  const [error, setError] = useState("");
  const [anywhere, setAnywhere] = useState(false);
  const query = draft ? draftQuery(draft) : "";
  const bloodType = draft?.bloodType;
  // Joined so the effect only re-runs when the actual cities change.
  const cities = draft?.locations.join("|");

  useEffect(() => {
    if (!bloodType || !cities) return;
    let active = true;
    searchDonors(bloodType, anywhere ? null : cities.split("|"), user.uid)
      .then((results) => active && setDonors(results))
      .catch(() => active && setError("We couldn't load donors right now. Please try again."));
    return () => {
      active = false;
    };
  }, [bloodType, cities, anywhere, user.uid]);

  async function requestAll(targets: DonorProfile[]) {
    if (!draft) return;
    setBroadcasting(true);
    setBroadcastError("");
    try {
      const sent = await createRequests(
        {
          requesterId: user.uid,
          requesterName: shortName(profile.fullName),
          bloodType: draft.bloodType,
          quantity: draft.quantity,
          location: draft.locations[0],
          reason: draft.reason,
          urgency: draft.urgency,
          hospital: draft.hospital,
          neededBy: draft.neededBy,
        },
        targets.map((donor) => ({ uid: donor.uid, name: donor.name })),
      );
      router.replace(sent === 0 ? "/requests" : `/request-sent?count=${sent}`);
    } catch {
      setBroadcastError("We couldn't send all requests. Please try again.");
      setBroadcasting(false);
    }
  }

  function searchEverywhere() {
    setDonors(null);
    setAnywhere(true);
  }

  if (!draft) {
    return (
      <Screen>
        <BackButton href="/request-blood" />
        <EmptyState title="Start a request first" description="Tell us the blood type and location you need." action={<ButtonLink href="/request-blood" size="compact">Request Blood</ButtonLink>} />
      </Screen>
    );
  }

  return (
    <Screen gap={20} wide>
      <BackButton href="/request-blood" />
      <Steps steps={["Details", "Donors", "Sent"]} current={1} />
      <Heading title="Compatible Donors" subtitle={<span className={styles.criteria}>Blood Type: {draft.bloodType}<br />Location: {anywhere ? "All locations" : cityList(draft.locations)}<br /><b className={styles[draft.urgency]}>{urgencyInfo[draft.urgency].label}</b> · needed by {formatShortDate(draft.neededBy)}</span>} />
      {error
        ? <EmptyState title="Something went wrong" description={error} />
        : donors === null
          ? <ListSkeleton count={4} />
          : donors.length === 0
            ? (
              <EmptyState
                title="No donors found yet"
                description={anywhere
                  ? `No available donors compatible with ${draft.bloodType} right now. Please check back later.`
                  : `No available donors compatible with ${draft.bloodType} in ${cityList(draft.locations)} right now.`}
                action={anywhere ? undefined : <Button variant="outline" size="compact" onClick={searchEverywhere}>Search all locations</Button>}
              />
            )
            : (
              <>
              {(() => {
                // Ready by the needed-by date counts, even if still recovering today.
                const eligible = donors.filter((donor) => isDonorEligible(donor, draft.neededBy)).slice(0, maxBroadcast);
                const short = draft.quantity > eligible.length;
                return eligible.length > 1 || (draft.quantity > 1 && eligible.length > 0) ? (
                  <div className={styles.broadcast}>
                    <span>
                      <strong>{draft.quantity > 1 ? `You need ${draft.quantity} bags, so ${draft.quantity} donors` : `Ask ${eligible.length} eligible donors at once`}</strong>
                      <small>
                        {draft.quantity > 1
                          ? `Each donor gives one unit (about ${unitMl} ml).${short ? ` Only ${eligible.length} can donate in time here, so try more cities too.` : " Ask several at once in case some can't make it."}`
                          : "You will be notified as each donor responds, and you can chat with anyone who accepts."}
                      </small>
                    </span>
                    <Button size="compact" onClick={() => requestAll(eligible)} disabled={broadcasting}>
                      <PaperPlaneTilt size={16} /> {broadcasting ? "Sending…" : `Request all ${eligible.length}`}
                    </Button>
                  </div>
                ) : null;
              })()}
              {broadcastError && <Alert>{broadcastError}</Alert>}
              <div className={uiStyles.list}>
                {donors.map((donor) => {
                  const eligible = isDonorEligible(donor, draft.neededBy);
                  return (
                    <Link key={donor.uid} href={`/donors/${donor.uid}?${query}`} className={cx(uiStyles.card, styles.donor, !eligible && styles.waiting)}>
                      {donor.photoURL
                        ? <ProfilePhoto src={donor.photoURL} size={64} />
                        : <InitialsAvatar name={donor.name} size={64} />}
                      <span className={styles.details}>
                        <strong>{donor.name}</strong>
                        <b>{donor.bloodType}</b>
                        <span>{eligible ? donor.location : `Can donate from ${formatShortDate(donor.eligibleFrom)}`}</span>
                      </span>
                      <span className={buttonClass("primary", "small")} style={{ boxShadow: "none" }}>View</span>
                    </Link>
                  );
                })}
              </div>
              </>
            )}
    </Screen>
  );
}
