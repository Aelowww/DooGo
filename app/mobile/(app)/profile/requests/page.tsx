"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HistoryCard } from "@/app/mobile/_components/history-card";
import { useSession } from "@/app/mobile/_components/session";
import { Badge, EmptyState, ListSkeleton, Screen, TopBar } from "@/app/mobile/_components/ui";
import { formatDate } from "@/lib/format";
import { statusLabel, subscribeRequests, type BloodRequest } from "@/lib/requests";

export default function RequestHistoryPage() {
  const { user } = useSession();
  const [requests, setRequests] = useState<BloodRequest[] | null>(null);

  useEffect(() => subscribeRequests("requesterId", user.uid, setRequests, () => setRequests([])), [user.uid]);

  return (
    <Screen nav="profile" topBar={<TopBar title="Request History" backHref="/profile" />} gap={16}>
      {requests === null
        ? <ListSkeleton />
        : requests.length === 0
          ? <EmptyState title="No requests yet" description="Blood requests you send will be listed here." />
          : requests.map((request) => (
            <Link key={request.id} href={`/requests/${request.id}`}>
              <HistoryCard
                roomy
                date={formatDate(request.createdAt)}
                bloodType={request.bloodType}
                title={request.location}
                subtitle={`Donor: ${request.status === "cancelled" ? "None" : request.donorName}`}
                badge={<Badge muted={request.status === "cancelled" || request.status === "declined"}>{statusLabel[request.status]}</Badge>}
              />
            </Link>
          ))}
    </Screen>
  );
}
