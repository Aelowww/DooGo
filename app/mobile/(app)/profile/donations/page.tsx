"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HistoryCard } from "@/app/mobile/_components/history-card";
import { useSession } from "@/app/mobile/_components/session";
import { EmptyState, ListSkeleton, Screen, TopBar } from "@/app/mobile/_components/ui";
import { formatDate } from "@/lib/format";
import { subscribeRequests, type BloodRequest } from "@/lib/requests";

export default function DonationHistoryPage() {
  const { user } = useSession();
  const [donations, setDonations] = useState<BloodRequest[] | null>(null);

  useEffect(() => subscribeRequests(
    "donorId",
    user.uid,
    (items) => setDonations(items
      .filter((item) => item.status === "completed")
      .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))),
    () => setDonations([]),
  ), [user.uid]);

  return (
    <Screen nav="profile" topBar={<TopBar title="Donation History" backHref="/profile" />} gap={16}>
      {donations === null
        ? <ListSkeleton />
        : donations.length === 0
          ? <EmptyState title="No donations yet" description="When you accept a request and mark it as donated, it will be recorded here." />
          : donations.map((donation) => (
            <Link key={donation.id} href={`/requests/${donation.id}`}>
              <HistoryCard
                date={formatDate(donation.completedAt ?? donation.createdAt)}
                bloodType={donation.bloodType}
                title={donation.location}
                subtitle={`Recipient: ${donation.requesterName}`}
              />
            </Link>
          ))}
    </Screen>
  );
}
