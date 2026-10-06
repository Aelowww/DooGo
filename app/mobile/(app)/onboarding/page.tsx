"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, CaretRight, HandHeart, Heartbeat } from "@phosphor-icons/react";
import { MedicalRecordCard } from "@/app/mobile/_components/medical-record";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, Button, Field, Heading, IconWell, Screen, SelectControl, Steps, TextControl, cx, uiStyles } from "@/app/mobile/_components/ui";
import { bloodGroups, hasMedicalRecord, toBloodType, type BloodGroup, type RhFactor } from "@/lib/blood";
import { todayISO } from "@/lib/format";
import { locations } from "@/lib/locations";
import { updateUserProfile } from "@/lib/users";
import styles from "./page.module.css";

const steps = ["About you", "Blood type", "Donating"];
const genders = ["Male", "Female", "Other", "Prefer not to say"];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile } = useSession();
  const [step, setStep] = useState(0);
  const [about, setAbout] = useState({ fullName: profile.fullName, phone: profile.phone, dateOfBirth: profile.dateOfBirth, gender: profile.gender });
  const [bloodGroup, setBloodGroup] = useState<string>(profile.bloodGroup ?? "");
  const [rhFactor, setRhFactor] = useState<RhFactor>(profile.rhFactor ?? "+");
  const [location, setLocation] = useState(profile.location ?? "");
  const [donor, setDonor] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const knowsBloodType = bloodGroup !== "";
  const bloodType = knowsBloodType ? toBloodType(bloodGroup as BloodGroup, rhFactor) : null;

  function next() {
    setError("");
    if (step === 0) {
      if (!about.fullName.trim()) return setError("Enter your full name.");
      if (about.phone && !/^\+?[\d\s()-]{7,20}$/.test(about.phone)) return setError("Enter a valid phone number.");
    }
    if (step === 1) {
      if (!bloodGroup) return setError("Select your blood type.");
      if (!location) return setError("Select your city so we can match you with people nearby.");
    }
    setStep(step + 1);
  }

  async function finish(skip = false) {
    setError("");
    const becomeDonor = !skip && donor === true;
    if (becomeDonor && !hasMedicalRecord(profile)) return setError("Save your medical record above, or choose “Not right now” and add it later.");
    setSaving(true);
    try {
      await updateUserProfile(profile, {
        fullName: about.fullName.trim() || profile.fullName,
        phone: about.phone.trim(),
        dateOfBirth: about.dateOfBirth,
        gender: about.gender,
        ...(knowsBloodType ? { bloodGroup: bloodGroup as BloodGroup, rhFactor } : {}),
        ...(location ? { location } : {}),
        available: becomeDonor,
        onboarded: true,
      });
      router.replace("/home");
    } catch {
      setError("We couldn't save your profile. Please try again.");
      setSaving(false);
    }
  }

  // Back on the left (secondary), the forward action on the right (primary, fills the row): reading order
  // ends on the next step, it sits under the thumb, and Back can't be hit by accident.
  const footer = (
    <div className={styles.stepNav}>
      {step > 0 && (
        <Button variant="outline" className={styles.back} onClick={() => setStep(step - 1)} disabled={saving}>
          <CaretLeft size={18} weight="bold" aria-hidden="true" /> Back
        </Button>
      )}
      {step < 2
        ? <Button className={styles.forward} onClick={next}>Continue <CaretRight size={18} weight="bold" aria-hidden="true" /></Button>
        : (
          <Button className={styles.forward} onClick={() => finish()} disabled={saving || donor === null}>
            {saving ? "Saving…" : donor ? "Finish & become a donor" : "Finish"}
          </Button>
        )}
    </div>
  );

  return (
    <Screen footer={footer} gap={20}>
      <div className={styles.top}>
        <Steps steps={steps} current={step} />
        <button type="button" className={styles.skip} onClick={() => finish(true)} disabled={saving}>Skip for now</button>
      </div>

      {step === 0 && (
        <>
          <Heading title={`Welcome, ${about.fullName.split(" ")[0] || "there"}!`} subtitle="Let's set up your profile. It takes about a minute." />
          {error && <Alert>{error}</Alert>}
          <div className={uiStyles.form}>
            <Field label="Full Name">
              <TextControl autoComplete="name" value={about.fullName} onChange={(event) => setAbout({ ...about, fullName: event.target.value })} />
            </Field>
            <Field label="Phone Number (optional)">
              <TextControl type="tel" autoComplete="tel" placeholder="+63 912 345 6789" value={about.phone} onChange={(event) => setAbout({ ...about, phone: event.target.value })} />
            </Field>
            <div className={styles.pair}>
              <Field label="Date of Birth">
                <TextControl type="date" max={todayISO()} value={about.dateOfBirth} onChange={(event) => setAbout({ ...about, dateOfBirth: event.target.value })} />
              </Field>
              <Field label="Gender">
                <SelectControl value={about.gender} onChange={(gender) => setAbout({ ...about, gender })} options={genders} placeholder="Select" />
              </Field>
            </div>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <Heading title="Your blood type" subtitle="We use it to match you with compatible people." />
          {error && <Alert>{error}</Alert>}
          <div className={styles.groups} role="radiogroup" aria-label="Blood group">
            {bloodGroups.map((group) => (
              <label key={group} className={cx(styles.group, bloodGroup === group && styles.groupOn)}>
                <input type="radio" name="group" checked={bloodGroup === group} onChange={() => setBloodGroup(group)} />
                {group}
              </label>
            ))}
          </div>
          {knowsBloodType && (
            <fieldset className={uiStyles.fieldset}>
              <legend>Rh Factor</legend>
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
          )}
          <p className={styles.note}>Not sure? Check an old lab result or donor card, or ask any hospital or blood bank to test it.</p>
          <Field label="City">
            <SelectControl value={location} onChange={setLocation} options={locations} placeholder="Select your city" />
          </Field>
        </>
      )}

      {step === 2 && (
        <>
          <Heading title="Would you like to donate?" subtitle={bloodType ? `As ${bloodType}, you could help people in ${location || "your city"}.` : "You can become a donor once you know your blood type."} />
          {error && <Alert>{error}</Alert>}
          <div className={styles.choices}>
            <button type="button" className={cx(styles.choice, donor === true && styles.choiceOn)} onClick={() => setDonor(true)} disabled={!knowsBloodType}>
              <IconWell icon={HandHeart} size={48} tone={donor === true ? "solid" : "tinted"} />
              <span>
                <strong>Yes, I want to donate</strong>
                <small>Upload a medical record and appear in donor searches.</small>
              </span>
            </button>
            <button type="button" className={cx(styles.choice, donor === false && styles.choiceOn)} onClick={() => setDonor(false)}>
              <IconWell icon={Heartbeat} size={48} tone={donor === false ? "solid" : "tinted"} />
              <span>
                <strong>Not right now</strong>
                <small>I mainly need to request blood. I can become a donor later.</small>
              </span>
            </button>
          </div>
          {donor === true && <MedicalRecordCard profile={profile} />}
        </>
      )}
    </Screen>
  );
}
