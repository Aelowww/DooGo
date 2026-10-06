"use client";

import { Minus, Plus } from "@phosphor-icons/react";
import { CityMultiSelect } from "@/app/mobile/_components/city-select";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { draftQuery, maxSearchCities } from "@/app/mobile/_components/request-params";
import { useSession } from "@/app/mobile/_components/session";
import { Alert, BackButton, Button, Field, Heading, Screen, SelectControl, Steps, TextControl, cx, uiStyles } from "@/app/mobile/_components/ui";
import { bloodTypes, isBloodType, urgencyInfo, urgencyLevels, type Urgency } from "@/lib/blood";
import { todayISO } from "@/lib/format";
import { locations } from "@/lib/locations";
import styles from "./page.module.css";

const maxBags = 10;

const requestSteps = ["Details", "Donors", "Sent"];

/** Default "needed by" for each urgency level. */
const urgencyDays: Record<Urgency, number> = { critical: 0, urgent: 2, standard: 7 };

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

export default function RequestBloodPage() {
  const router = useRouter();
  const { profile } = useSession();
  const [bloodType, setBloodType] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urgency, setUrgency] = useState<Urgency>("urgent");
  const [neededBy, setNeededBy] = useState(inDays(urgencyDays.urgent));
  const [cities, setCities] = useState<string[]>(profile.location ? [profile.location] : []);
  const [hospital, setHospital] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function chooseUrgency(level: Urgency) {
    setUrgency(level);
    setNeededBy(inDays(urgencyDays[level]));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isBloodType(bloodType)) return setError("Select the blood type you need.");
    if (cities.length === 0) return setError("Select at least one city to search for donors.");
    if (!hospital.trim()) return setError("Enter the hospital or blood bank where the blood is needed.");
    if (!reason.trim()) return setError("Tell donors why you need blood.");
    if (!neededBy || neededBy < todayISO()) return setError("Choose a needed-by date from today onward.");
    router.push(`/donors?${draftQuery({ bloodType, quantity, locations: cities, reason: reason.trim(), urgency, hospital: hospital.trim(), neededBy })}`);
  }

  return (
    <Screen onSubmit={submit} footer={<Button type="submit">Search Donors</Button>}>
      <BackButton href="/home" />
      <Steps steps={requestSteps} current={0} />
      <Heading title="Request Blood" subtitle="Tell us what you need" />
      <div className={cx(uiStyles.form, uiStyles.formLoose)}>
        {error && <Alert>{error}</Alert>}
        <Field label="Blood Type Needed">
          <SelectControl value={bloodType} onChange={setBloodType} options={bloodTypes} placeholder="Select Blood Type" required />
        </Field>

        <fieldset className={uiStyles.fieldset}>
          <legend>Urgency</legend>
          <div className={styles.urgency} role="radiogroup">
            {urgencyLevels.map((level) => (
              <label key={level} className={cx(styles.urgencyOption, styles[level], urgency === level && styles.selected)}>
                <input type="radio" name="urgency" value={level} checked={urgency === level} onChange={() => chooseUrgency(level)} />
                <strong>{urgencyInfo[level].label}</strong>
                <small>{urgencyInfo[level].hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className={styles.pair}>
          <div className={uiStyles.field}>
            <span id="quantity-label">Quantity (in Bags)</span>
            <div className={cx(uiStyles.control, uiStyles.stepper)} role="group" aria-labelledby="quantity-label">
              <button type="button" aria-label="Fewer bags" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                <Minus size={16} />
              </button>
              <output aria-live="polite">{quantity}</output>
              <button type="button" aria-label="More bags" disabled={quantity >= maxBags} onClick={() => setQuantity((value) => Math.min(maxBags, value + 1))}>
                <Plus size={16} />
              </button>
            </div>
          </div>
          <Field label="Needed By">
            <TextControl type="date" min={todayISO()} value={neededBy} onChange={(event) => setNeededBy(event.target.value)} />
          </Field>
        </div>

        <div className={uiStyles.field}>
          <span>Search donors in <small className={styles.cityCount}>{cities.length}/{maxSearchCities} cities</small></span>
          <CityMultiSelect value={cities} onChange={(next) => { setError(""); setCities(next); }} options={locations} max={maxSearchCities} />
        </div>
        <Field label="Hospital / Blood Bank">
          <TextControl placeholder="e.g. Iloilo Doctors' Hospital" value={hospital} maxLength={100} onChange={(event) => setHospital(event.target.value)} />
        </Field>
        <Field label="Reason">
          <TextControl placeholder="Enter Reason" value={reason} maxLength={80} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </div>
    </Screen>
  );
}
