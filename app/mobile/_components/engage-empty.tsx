"use client";

import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { buttonClass, cx } from "./ui";
import styles from "./engage-empty.module.css";

export type EngageAction = { label: string; href?: string; onClick?: () => void; icon?: PhosphorIcon };

/**
 * Empty state that invites the next step instead of saying "nothing here":
 * an illustration, a reason to act, one or two actions, and how it works.
 */
export function EngageEmpty({
  icon: MainIcon,
  orbit = [],
  eyebrow,
  title,
  body,
  primary,
  secondary,
  steps,
  compact = false,
}: {
  icon: PhosphorIcon;
  /** Small icons floating around the main one. */
  orbit?: PhosphorIcon[];
  eyebrow?: string;
  title: string;
  body: React.ReactNode;
  primary?: EngageAction;
  secondary?: EngageAction;
  steps?: { title: string; body: string }[];
  compact?: boolean;
}) {
  return (
    <section className={cx(styles.empty, compact && styles.compact)}>
      <div className={styles.art} aria-hidden="true">
        <span className={styles.ring} />
        <span className={styles.disc}><MainIcon size={compact ? 30 : 40} weight="duotone" /></span>
        {orbit.slice(0, 3).map((OrbitIcon, index) => (
          <span key={index} className={cx(styles.orbit, styles[`orbit${index}`])}>
            <OrbitIcon size={compact ? 14 : 18} weight="duotone" />
          </span>
        ))}
      </div>

      <div className={styles.copy}>
        {eyebrow && <small>{eyebrow}</small>}
        <h2>{title}</h2>
        <p>{body}</p>
      </div>

      {(primary || secondary) && (
        <div className={styles.actions}>
          {primary && <ActionButton action={primary} variant="primary" />}
          {secondary && <ActionButton action={secondary} variant="outline" />}
        </div>
      )}

      {steps && !compact && (
        <ol className={styles.steps}>
          {steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ActionButton({ action, variant }: { action: EngageAction; variant: "primary" | "outline" }) {
  const { icon: ActionIcon } = action;
  const content = <>{ActionIcon && <ActionIcon size={18} weight="bold" aria-hidden="true" />}{action.label}</>;
  const className = cx(buttonClass(variant, "compact"), styles.action);
  return action.href
    ? <Link href={action.href} className={className}>{content}</Link>
    : <button type="button" onClick={action.onClick} className={className}>{content}</button>;
}
