"use client";

import { useState } from "react";
import { useToast } from "@/app/_components/toast";
import { useRouter } from "next/navigation";
import { MedicalRecordCard } from "@/app/mobile/_components/medical-record";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, Field, Heading, Screen, SelectControl, cx, uiStyles } from "@/app/mobile/_components/ui";
import { bloodGroups, type BloodGroup, type RhFactor } from "@/lib/blood";
import { locations } from "@/lib/locations";
import { updateUserProfile } from "@/lib/users";

/** Blood type, city, and medical record. Availability itself is switched on the Donating page. */
export default function DonorDetailsPage() {
  const router = useRouter();
  const { profile } = useSession();
  const toast = useToast();
  const [bloodGroup, setBloodGroup] = useState<string>(profile.bloodGroup ?? "");
  const [rhFactor, setRhFactor] = useState<RhFactor>(profile.rhFactor ?? "+");
  const [location, setLocation] = useState(profile.location ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!bloodGroup) return setError("Select your blood type.");
    if (!location) return setError("Select your city.");
    setError("");
    setSaving(true);
    try {
      await updateUserProfile(profile, { bloodGroup: bloodGroup as BloodGroup, rhFactor, location });
      toast("Donor details saved", { body: "Your blood type and city are up to date." });
      router.replace("/donate");
    } catch {
      setError("We couldn't save your details. Please try again.");
      setSaving(false);
    }
  }

  return (
    <Screen onSubmit={submit} footer={<Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save details"}</Button>}>
      <BackButton href="/donate" />
      <Heading title="Donor details" subtitle="Your blood type, city, and medical record" />
      <div className={cx(uiStyles.form, uiStyles.formLoose)}>
        {error && <Alert>{error}</Alert>}
        <Field label="Blood type">
          <SelectControl value={bloodGroup} onChange={setBloodGroup} options={bloodGroups} placeholder="Select blood type" required />
        </Field>
        <fieldset className={uiStyles.fieldset}>
          <legend>Rh factor</legend>
          <div className={cx(uiStyles.control, uiStyles.radioGroup)}>
            {([["+", "Positive (+)"], ["-", "Negative (-)"]] as const).map(([value, label]) => (
              <label key={value} className={cx(uiStyles.radio, rhFactor === value && uiStyles.radioChecked)}>
                <input type="radio" name="rh" value={value} checked={rhFactor === value} onChange={() => setRhFactor(value)} />
                <i />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="City">
          <SelectControl value={location} onChange={setLocation} options={locations} placeholder="Select your city" required />
        </Field>
        <MedicalRecordCard profile={profile} />
      </div>
    </Screen>
  );
}
