"use client";

import { CaretRight } from "@phosphor-icons/react";
import { BackButton, Heading, Screen, cx, uiStyles } from "@/app/mobile/_components/ui";
import styles from "./page.module.css";

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

const topics: { title: string; body: React.ReactNode }[] = [
  {
    title: "FAQs",
    body: (
      <>
        <p><strong>Who can donate?</strong> Most healthy adults aged 18–65 who weigh at least 50 kg. The hospital or blood bank does the final screening.</p>
        <p><strong>How often can I donate?</strong> Whole blood every 12 weeks for men and every 16 weeks for women (WHO and Philippine Red Cross guidance). DooGo tracks this for you and shows when you can donate again.</p>
        <p><strong>Who can see my details?</strong> Only signed-in DooGo users, and only what you allow in Privacy Settings. Your email and phone number are never shown to others.</p>
      </>
    ),
  },
  {
    title: "How to Request Blood",
    body: (
      <ol>
        <li>Tap <strong>Request Blood</strong> on the Home screen.</li>
        <li>Choose the blood type, number of bags, location, and reason.</li>
        <li>Tap <strong>Search Donors</strong> to see compatible donors near you.</li>
        <li>Open a donor&apos;s profile and tap <strong>Send Request</strong>. You&apos;ll be notified when they respond.</li>
      </ol>
    ),
  },
  {
    title: "How to Donate Blood",
    body: (
      <ol>
        <li>Tap <strong>Donate blood</strong> on the Home screen, then <strong>Edit</strong> under Donor details.</li>
        <li>Add your blood type, city, and a medical record, then switch on <strong>availability</strong>.</li>
        <li>Accept or decline requests from the <strong>Requests</strong> tab, then chat with the seeker in <strong>Messages</strong>.</li>
        <li>After donating, open the request and tap <strong>Mark as Donated</strong> to update your history.</li>
      </ol>
    ),
  },
  {
    title: "Contact Support",
    body: supportEmail
      ? <p>Email us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. We usually reply within 1–2 days.</p>
      : <p>Our support inbox isn&apos;t set up yet. Please check back soon.</p>,
  },
  {
    title: "Report a Problem",
    body: supportEmail
      ? <p>Something not working? <a href={`mailto:${supportEmail}?subject=${encodeURIComponent("DooGo problem report")}`}>Send us a report</a> with what you were doing and what went wrong.</p>
      : <p>Problem reports will be available once our support inbox is set up.</p>,
  },
];

export default function HelpPage() {
  return (
    <Screen
      gap={16}
      footer={
        <p className={styles.version}>
          <strong>Version 1.0.0</strong>
          <span>DooGo © {new Date().getFullYear()}</span>
        </p>
      }
    >
      <BackButton />
      <Heading title="Help & Support" subtitle={<span className={styles.subtitle}>Find answers, learn how to request or donate blood, and get in touch with our support team.</span>} />
      <div className={cx(uiStyles.list, uiStyles.listTight, styles.topics)}>
        {topics.map((topic) => (
          <details key={topic.title} className={cx(uiStyles.cardTinted, styles.topic)}>
            <summary className={uiStyles.menuRow}>
              <span>{topic.title}</span>
              <CaretRight weight="bold" className={styles.chevron} size={20} aria-hidden="true" />
            </summary>
            <div className={styles.answer}>{topic.body}</div>
          </details>
        ))}
      </div>
    </Screen>
  );
}
