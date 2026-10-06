export const bloodGroups = ["A", "B", "AB", "O"] as const;
export type BloodGroup = (typeof bloodGroups)[number];

export type RhFactor = "+" | "-";

export const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export type BloodType = (typeof bloodTypes)[number];

/** Donor blood types that a recipient of `recipient` can safely receive red cells from. */
const receivesFrom: Record<BloodType, BloodType[]> = {
  "O-": ["O-"],
  "O+": ["O+", "O-"],
  "A-": ["A-", "O-"],
  "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"],
};

export function compatibleDonorTypes(recipient: BloodType): BloodType[] {
  return receivesFrom[recipient];
}

/** Recipient blood types a donor of `donor` can give to. */
export function canDonateTo(donor: BloodType): BloodType[] {
  return bloodTypes.filter((recipient) => receivesFrom[recipient].includes(donor));
}

export function toBloodType(group: BloodGroup | null | undefined, rh: RhFactor | null | undefined): BloodType | null {
  if (!group || !rh) return null;
  return `${group}${rh}` as BloodType;
}

export function isBloodType(value: string | null | undefined): value is BloodType {
  return Boolean(value && (bloodTypes as readonly string[]).includes(value));
}

/* ---------- Donation interval ---------- */

/** One whole-blood donation is one unit, about 450 ml. A request for 3 bags needs 3 donors. */
export const unitMl = 450;

/**
 * Minimum days between whole-blood donations, following WHO and Philippine Red Cross guidance:
 * 12 weeks for men, 16 weeks for women. When sex isn't given we use the safer 16 weeks.
 */
export function donationIntervalDays(gender?: string | null) {
  return gender === "Male" ? 84 : 112;
}

export function intervalLabel(gender?: string | null) {
  return `${donationIntervalDays(gender) / 7} weeks`;
}

export function isEligibleToDonate(lastDonation: string | null | undefined, today = new Date(), gender?: string | null) {
  if (!lastDonation) return true;
  const last = new Date(`${lastDonation}T00:00:00`);
  const days = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  return days >= donationIntervalDays(gender);
}

export function nextEligibleDate(lastDonation: string, gender?: string | null) {
  const next = new Date(`${lastDonation}T00:00:00`);
  next.setDate(next.getDate() + donationIntervalDays(gender));
  return next;
}

/* ---------- Medical record ---------- */

/** Documents a donor can upload. The hospital still does its own screening before any donation. */
export const medicalRecordKinds = ["Blood typing result", "Medical certificate", "Blood donor card", "Laboratory results"] as const;
export type MedicalRecordKind = (typeof medicalRecordKinds)[number];

/** What the profile keeps about the record. The image itself lives in medicalRecords/{uid}, private to the donor. */
export type MedicalRecordSummary = { kind: MedicalRecordKind; issuer: string; issuedOn: string; uploadedAt: string };

export function hasMedicalRecord(profile: { medicalRecord?: MedicalRecordSummary | null }) {
  return Boolean(profile.medicalRecord?.uploadedAt);
}

type DonorFacts = {
  bloodType?: BloodType | null;
  gender?: string | null;
  lastDonation: string | null;
  medicalRecord?: MedicalRecordSummary | null;
};

const longDate = (date: Date) => date.toLocaleDateString("en-US", { month: "long", day: "numeric" });

/** Why someone can't donate right now, or null if they can. */
export function donationBlocker(profile: DonorFacts, today = new Date()) {
  if (!hasMedicalRecord(profile)) return "Add your medical record before donating.";
  if (!isEligibleToDonate(profile.lastDonation, today, profile.gender)) {
    const next = nextEligibleDate(profile.lastDonation!, profile.gender);
    return `Your body needs time to rebuild. You can donate again on ${longDate(next)}, ${intervalLabel(profile.gender)} after your last donation.`;
  }
  return null;
}

/**
 * Everything that stops a donor from accepting one specific request, most fundamental first.
 * `commitment` is another request they've already accepted but not donated for yet;
 * `covered` means enough donors have already agreed to give.
 */
export function acceptBlocker(
  profile: DonorFacts,
  request: { bloodType: BloodType; neededBy?: string },
  context: { commitment?: { requesterName: string } | null; covered?: boolean } = {},
  today = new Date(),
) {
  if (!profile.bloodType) return "Add your blood type before accepting requests.";
  if (!canDonateTo(profile.bloodType).includes(request.bloodType)) {
    return `${profile.bloodType} blood can't be given to a ${request.bloodType} patient, so you can't accept this one.`;
  }
  if (context.covered) return "Enough donors have already agreed to this request. Thank you for being ready to help!";
  if (context.commitment) {
    return `You've already agreed to donate to ${context.commitment.requesterName}. You can only give one unit per donation, so finish that one first.`;
  }
  if (!hasMedicalRecord(profile)) return "Add your medical record before donating.";
  // Still recovering is fine if they'll be ready by the day the blood is needed.
  if (!isEligibleToDonate(profile.lastDonation, today, profile.gender)) {
    const next = nextEligibleDate(profile.lastDonation!, profile.gender);
    const neededBy = request.neededBy ? new Date(`${request.neededBy}T23:59:59`) : today;
    if (next > neededBy) {
      return `You can donate again on ${longDate(next)} (${intervalLabel(profile.gender)} after your last donation), which is after this blood is needed.`;
    }
  }
  return null;
}

/* ---------- Request urgency ---------- */

export const urgencyLevels = ["critical", "urgent", "standard"] as const;
export type Urgency = (typeof urgencyLevels)[number];

export const urgencyInfo: Record<Urgency, { label: string; hint: string; rank: number }> = {
  critical: { label: "Critical", hint: "Needed within 24 hours", rank: 0 },
  urgent: { label: "Urgent", hint: "Needed within 3 days", rank: 1 },
  standard: { label: "Standard", hint: "Scheduled or planned", rank: 2 },
};
