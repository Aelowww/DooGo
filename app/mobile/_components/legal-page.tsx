"use client";

import { useRouter } from "next/navigation";
import { BackButton, Button, Heading, Screen } from "./ui";
import styles from "./legal-page.module.css";

export type LegalSection = { title: string; body: string };

export function LegalPage({ title, sections, action, actionVariant = "primary" }: {
  title: string;
  sections: LegalSection[];
  action: string;
  actionVariant?: "primary" | "outline";
}) {
  const router = useRouter();
  const leave = () => (window.history.length > 1 ? router.back() : router.push("/create-account"));

  return (
    <Screen gap={16} footer={<Button variant={actionVariant} size="compact" onClick={leave}>{action}</Button>}>
      <BackButton />
      <Heading title={title} />
      <div className={styles.sections}>
        {sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
    </Screen>
  );
}
