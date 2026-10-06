"use client";

import { useSession } from "@/app/mobile/_components/session";
import { ButtonLink, Screen, TopBar, cx, uiStyles } from "@/app/mobile/_components/ui";
import { canDonateTo, isEligibleToDonate, nextEligibleDate } from "@/lib/blood";
import { formatDate, formatLongDate } from "@/lib/format";
import styles from "./page.module.css";

export default function BloodInformationPage() {
  const { profile } = useSession();
  const { bloodType, rhFactor, lastDonation, totalDonations } = profile;

  const compatible = bloodType
    ? [bloodType, ...canDonateTo(bloodType).filter((type) => type !== bloodType)].join(", ")
    : null;

  const cards = [
    {
      label: "Blood Type",
      value: bloodType ?? "Not set",
      note: compatible ? `Compatible with ${compatible}` : "Add your blood type to start receiving requests",
    },
    {
      label: "Rh Factor",
      value: rhFactor === "+" ? "Positive" : rhFactor === "-" ? "Negative" : "Not set",
      note: rhFactor === "+" ? "D-antigen is present on red blood cells" : rhFactor === "-" ? "D-antigen is absent from red blood cells" : "Positive or negative, from your blood test",
    },
    {
      label: "Last Donation Date",
      value: lastDonation ? formatDate(lastDonation) : "None yet",
      note: !lastDonation || isEligibleToDonate(lastDonation, new Date(), profile.gender)
        ? "Eligible to donate again"
        : `Eligible again on ${formatLongDate(nextEligibleDate(lastDonation, profile.gender))}`,
    },
    {
      label: "Total Donations",
      value: String(totalDonations),
      note: "Total successful donations",
    },
  ];

  return (
    <Screen nav="profile" topBar={<TopBar title="Blood Information" backHref="/profile" />} gap={16}>
      {cards.map((card) => (
        <section key={card.label} className={cx(uiStyles.cardTinted, styles.card)}>
          <h2>{card.label}</h2>
          <strong>{card.value}</strong>
          <p>{card.note}</p>
        </section>
      ))}
      {!bloodType && <ButtonLink href="/donate/setup" size="compact">Set Up Donation</ButtonLink>}
    </Screen>
  );
}
