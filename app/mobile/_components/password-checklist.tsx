"use client";

import { Check, X } from "@phosphor-icons/react";
import { containsPersonalInfo, passwordRules, passwordStrength, strengthLabels } from "@/lib/password";
import { cx } from "./ui";
import styles from "./password-checklist.module.css";

/** Live strength meter and rule checklist shown under a new-password field. */
export function PasswordChecklist({ password, name, email }: { password: string; name?: string; email?: string }) {
  const context = { name, email };
  const strength = passwordStrength(password, context);
  const personal = password.length > 0 && containsPersonalInfo(password, context);

  return (
    <div className={styles.box} aria-live="polite">
      <div className={styles.meter}>
        <span className={styles.bars} aria-hidden="true">
          {[1, 2, 3, 4].map((level) => <i key={level} className={cx(level <= strength && styles[`s${strength}`])} />)}
        </span>
        <small className={styles[`t${strength}`]}>{password ? strengthLabels[strength] : "Password strength"}</small>
      </div>
      <ul className={styles.rules}>
        {passwordRules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.id} className={ok ? styles.ok : undefined}>
              {ok ? <Check size={14} weight="bold" /> : <span className={styles.dot} />}
              {rule.label}
            </li>
          );
        })}
        {personal && (
          <li className={styles.bad}>
            <X size={14} weight="bold" /> Doesn&apos;t contain your name or email
          </li>
        )}
      </ul>
    </div>
  );
}
