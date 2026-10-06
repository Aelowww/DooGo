"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { Drop, Info } from "@phosphor-icons/react";
import { bloodGroups, toBloodType, type BloodGroup, type RhFactor } from "@/lib/blood";
import { firebaseAuth } from "@/lib/firebase/client";
import { firstName } from "@/lib/format";
import { locations } from "@/lib/locations";
import { updateUserProfile, type UserProfile } from "@/lib/users";
import { Alert, Button, Field, SelectControl, cx } from "./ui";
import styles from "./blood-details-prompt.module.css";

/** Blood type and city are what matching runs on, so nobody uses the app without them. */
export function needsBloodDetails(profile: UserProfile) {
  return !profile.bloodType || !profile.location;
}

/** Required pop-up: can't be dismissed until blood type and city are saved (logging out is the only way out). */
export function BloodDetailsPrompt({ profile }: { profile: UserProfile }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [group, setGroup] = useState<BloodGroup | "">(profile.bloodGroup ?? "");
  const [rh, setRh] = useState<RhFactor>(profile.rhFactor ?? "+");
  const [location, setLocation] = useState(profile.location ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!group) return setError("Select your blood group.");
    if (!location) return setError("Select your city.");
    setError("");
    setSaving(true);
    try {
      // Closing happens automatically: the profile updates and the gate stops rendering this.
      await updateUserProfile(profile, { bloodGroup: group, rhFactor: rh, location });
    } catch {
      setError("We couldn't save your details. Please try again.");
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="blood-details-title" onCancel={(event) => event.preventDefault()}>
      <form className={styles.card} onSubmit={save}>
        <header className={styles.header}>
          <span className={styles.drop}><Drop size={30} weight="fill" /></span>
          <h2 id="blood-details-title">One last step{profile.fullName ? `, ${firstName(profile.fullName)}` : ""}</h2>
          <p>DooGo matches every request by blood type and city. Add yours to continue.</p>
        </header>

        {error && <Alert>{error}</Alert>}

        <fieldset className={styles.fieldset}>
          <legend>Blood group</legend>
          <div className={styles.groups}>
            {bloodGroups.map((item) => (
              <label key={item} className={cx(styles.group, group === item && styles.on)}>
                <input type="radio" name="group" checked={group === item} onChange={() => setGroup(item)} />
                {item}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend>Rh factor</legend>
          <div className={styles.rh}>
            {([["+", "Positive (+)"], ["-", "Negative (−)"]] as const).map(([value, label]) => (
              <label key={value} className={cx(styles.rhOption, rh === value && styles.on)}>
                <input type="radio" name="rh" checked={rh === value} onChange={() => setRh(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="City">
          <SelectControl value={location} onChange={setLocation} options={locations} placeholder="Select your city" />
        </Field>

        <p className={styles.hint}>
          <Info size={16} weight="fill" />
          <span>Not sure of your blood type? Check an old lab result or donor card, or ask any hospital or blood bank to test it.</span>
        </p>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : group ? `Save ${toBloodType(group, rh)} and continue` : "Save and continue"}
        </Button>
        <button type="button" className={styles.logout} onClick={() => signOut(firebaseAuth())} disabled={saving}>Log out instead</button>
      </form>
    </dialog>
  );
}
