"use client";

import { useRef, useState } from "react";
import { useToast } from "@/app/_components/toast";
import { Camera, FileText, SealCheck, ShieldCheck, Trash, UploadSimple } from "@phosphor-icons/react";
import { hasMedicalRecord, medicalRecordKinds, type MedicalRecordKind } from "@/lib/blood";
import { formatLongDate, todayISO } from "@/lib/format";
import { getMedicalRecord, removeMedicalRecord, saveMedicalRecord } from "@/lib/medical";
import { toDocumentDataUrl } from "@/lib/photo";
import type { UserProfile } from "@/lib/users";
import { Alert, Button, Field, SelectControl, TextControl, cx } from "./ui";
import styles from "./medical-record.module.css";

/**
 * Donors upload one medical record (e.g. a blood typing result) before they can be available.
 * We don't ask for weight or health questions — the hospital screens every donor on the day.
 */
export function MedicalRecordCard({ profile }: { profile: UserProfile }) {
  const onFile = hasMedicalRecord(profile);
  const [editing, setEditing] = useState(!onFile);
  const [kind, setKind] = useState<string>(profile.medicalRecord?.kind ?? "");
  const [issuer, setIssuer] = useState(profile.medicalRecord?.issuer ?? "");
  const [issuedOn, setIssuedOn] = useState(profile.medicalRecord?.issuedOn ?? "");
  const [image, setImage] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Upload a photo or screenshot of the document (JPG or PNG).");
    setError("");
    try {
      setImage(await toDocumentDataUrl(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn't read that image.");
    }
  }

  async function save() {
    if (!kind) return setError("Choose what kind of document this is.");
    if (!issuer.trim()) return setError("Enter the hospital, clinic, or blood bank that issued it.");
    if (!issuedOn) return setError("Enter the date on the document.");
    if (!image) return setError("Add a photo of the document.");
    setBusy(true);
    setError("");
    try {
      await saveMedicalRecord(profile, { kind: kind as MedicalRecordKind, issuer: issuer.trim(), issuedOn, image });
      setImage(null);
      setEditing(false);
      toast("Medical record saved", { body: "Others will see a Verified badge on your donor profile." });
    } catch {
      setError("We couldn't save your record. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await removeMedicalRecord(profile);
      toast("Medical record removed", { body: "You're hidden from donor searches until you add a new one." });
      setPreview(null);
      setEditing(true);
    } finally {
      setBusy(false);
    }
  }

  async function togglePreview() {
    if (preview) return setPreview(null);
    const record = await getMedicalRecord(profile.uid).catch(() => null);
    setPreview(record?.image ?? null);
  }

  return (
    <section className={styles.card}>
      <header>
        <span className={styles.icon}><ShieldCheck size={22} weight="duotone" /></span>
        <div>
          <h2>Medical record</h2>
          <p>Required before you can donate. Only you can see the document. Others just see a &ldquo;verified&rdquo; badge.</p>
        </div>
      </header>

      {!editing && profile.medicalRecord ? (
        <>
          <div className={styles.onFile}>
            <SealCheck size={24} weight="fill" />
            <span>
              <strong>{profile.medicalRecord.kind}</strong>
              <small>{profile.medicalRecord.issuer} · {formatLongDate(profile.medicalRecord.issuedOn)}</small>
            </span>
          </div>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from Firestore
            <img className={styles.preview} src={preview} alt="Your medical record" />
          )}
          <div className={styles.row}>
            <Button variant="ghost" size="compact" onClick={togglePreview}><FileText size={18} /> {preview ? "Hide" : "View"}</Button>
            <Button variant="outline" size="compact" onClick={() => setEditing(true)}><UploadSimple size={18} /> Replace</Button>
            <Button variant="ghost" size="compact" onClick={remove} disabled={busy} aria-label="Remove medical record"><Trash size={18} /></Button>
          </div>
        </>
      ) : (
        <div className={styles.form}>
          {error && <Alert>{error}</Alert>}
          <Field label="Document type">
            <SelectControl value={kind} onChange={setKind} options={medicalRecordKinds} placeholder="Select document" />
          </Field>
          <div className={styles.pair}>
            <Field label="Issued by">
              <TextControl placeholder="Hospital or clinic" value={issuer} maxLength={100} onChange={(event) => setIssuer(event.target.value)} />
            </Field>
            <Field label="Date issued">
              <TextControl type="date" max={todayISO()} value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
            </Field>
          </div>
          <button type="button" className={cx(styles.drop, image && styles.dropFilled)} onClick={() => fileRef.current?.click()}>
            {image
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
              ? <img src={image} alt="Selected document" />
              : <><Camera size={28} weight="duotone" /><strong>Add a photo of the document</strong><small>Take a picture or upload a screenshot (JPG or PNG)</small></>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
          <div className={styles.row}>
            {onFile && <Button variant="ghost" size="compact" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>}
            <Button size="compact" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save medical record"}</Button>
          </div>
        </div>
      )}
    </section>
  );
}
