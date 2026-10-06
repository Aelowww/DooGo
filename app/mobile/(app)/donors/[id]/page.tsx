"use client";

import { CalendarBlank, Clock, Info, MapPin } from "@phosphor-icons/react";
import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequestDraft } from "@/app/mobile/_components/request-params";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, ButtonLink, EmptyState, IconWell, ListSkeleton, ProfilePhoto, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import { formatDate, formatLongDate, shortName } from "@/lib/format";
import { createRequest, findOpenRequest, type BloodRequest } from "@/lib/requests";
import { isDonorEligible, subscribeDonor, type DonorProfile } from "@/lib/users";
import styles from "./page.module.css";

export default function DonorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<Screen><ListSkeleton /></Screen>}>
      <DonorDetails id={id} />
    </Suspense>
  );
}

function DonorDetails({ id }: { id: string }) {
  const router = useRouter();
  const { user, profile } = useSession();
  const draft = useRequestDraft();
  const [donor, setDonor] = useState<DonorProfile | null | undefined>(undefined);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [openRequest, setOpenRequest] = useState<BloodRequest | null>(null);

  useEffect(() => subscribeDonor(id, setDonor), [id]);

  // One open request per donor: show the existing one instead of sending a duplicate.
  useEffect(() => {
    let active = true;
    findOpenRequest(user.uid, id).then((request) => active && setOpenRequest(request)).catch(() => {});
    return () => {
      active = false;
    };
  }, [user.uid, id]);

  async function sendRequest() {
    if (!draft || !donor) return;
    setSending(true);
    setError("");
    try {
      const existing = await findOpenRequest(user.uid, donor.uid);
      if (existing) {
        setOpenRequest(existing);
        setSending(false);
        return;
      }
      await createRequest({
        requesterId: user.uid,
        requesterName: shortName(profile.fullName),
        donorId: donor.uid,
        donorName: donor.name,
        bloodType: draft.bloodType,
        quantity: draft.quantity,
        location: draft.locations[0],
        reason: draft.reason,
        urgency: draft.urgency,
        hospital: draft.hospital,
        neededBy: draft.neededBy,
      });
      router.replace(`/request-sent?name=${encodeURIComponent(donor.name)}`);
    } catch {
      setError("We couldn't send your request. Please try again.");
      setSending(false);
    }
  }

  if (donor === undefined) return <Screen><BackButton /><ListSkeleton count={4} /></Screen>;
  if (donor === null) {
    return (
      <Screen>
        <BackButton />
        <EmptyState title="Donor not found" description="This donor may have deleted their account." />
      </Screen>
    );
  }

  const isSelf = donor.uid === user.uid;
  const eligible = isDonorEligible(donor);
  const details = [
    { icon: MapPin, label: "Location", value: donor.location || "Not set" },
    { icon: CalendarBlank, label: "Last Donation", value: donor.lastDonation ? formatDate(donor.lastDonation) : "No donations recorded" },
    {
      icon: Clock,
      label: "Availability",
      value: !donor.available ? "Unavailable" : eligible ? "Available" : `Available from ${formatLongDate(donor.eligibleFrom)}`,
    },
    { icon: Info, label: "About", value: donor.about || "Willing to help." },
  ];

  return (
    <Screen
      gap={20}
      footer={openRequest ? (
        <ButtonLink href={`/requests/${openRequest.id}`} variant="outline" size="compact">
          View Your {openRequest.status === "accepted" ? "Accepted" : "Pending"} Request
        </ButtonLink>
      ) : draft && !isSelf ? (
        <Button size="compact" onClick={sendRequest} disabled={sending || !donor.available}>
          {sending ? "Sending…" : donor.available ? "Send Request" : "Currently Unavailable"}
        </Button>
      ) : undefined}
    >
      <BackButton />
      <header className={styles.header}>
        <ProfilePhoto src={donor.photoURL} size={120} ring="tinted" />
        <h1 className={uiStyles.screenTitle}>{donor.name}</h1>
        {donor.bloodType && <p className={styles.bloodType}>{donor.bloodType}</p>}
      </header>
      {error && <Alert>{error}</Alert>}
      <div className={cx(uiStyles.list, uiStyles.listTight)}>
        {details.map((detail) => (
          <div key={detail.label} className={cx(uiStyles.card, styles.detail)}>
            <IconWell icon={detail.icon} size={44} />
            <span>
              <strong>{detail.label}</strong>
              <span>{detail.value}</span>
            </span>
          </div>
        ))}
      </div>
    </Screen>
  );
}
