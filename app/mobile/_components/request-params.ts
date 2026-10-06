"use client";

import { useSearchParams } from "next/navigation";
import { isBloodType, urgencyLevels, type BloodType, type Urgency } from "@/lib/blood";
import { todayISO } from "@/lib/format";

export type RequestDraft = {
  bloodType: BloodType;
  quantity: number;
  /** Cities to search for donors. The first is where the patient is, and is saved on the request. */
  locations: string[];
  reason: string;
  urgency: Urgency;
  hospital: string;
  neededBy: string;
};

/** Seekers can search up to this many cities at once. */
export const maxSearchCities = 5;

/** Reads the Request Blood form values that travel through the donor search screens as query params. */
export function useRequestDraft(): RequestDraft | null {
  const params = useSearchParams();
  const type = params.get("type");
  const locations = (params.get("location") ?? "").split("|").map((city) => city.trim()).filter(Boolean).slice(0, maxSearchCities);
  if (!isBloodType(type) || locations.length === 0) return null;
  const quantity = Math.min(10, Math.max(1, Number(params.get("qty")) || 1));
  const urgency = (urgencyLevels as readonly string[]).includes(params.get("urgency") ?? "") ? (params.get("urgency") as Urgency) : "standard";
  const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(params.get("by") ?? "") ? params.get("by")! : todayISO();
  return {
    bloodType: type,
    quantity,
    locations,
    reason: params.get("reason") || "",
    urgency,
    hospital: params.get("hospital") || "",
    neededBy,
  };
}

export function draftQuery(draft: RequestDraft) {
  return new URLSearchParams({
    type: draft.bloodType,
    qty: String(draft.quantity),
    location: draft.locations.join("|"),
    reason: draft.reason,
    urgency: draft.urgency,
    hospital: draft.hospital,
    by: draft.neededBy,
  }).toString();
}

/** "Iloilo City", "Iloilo City and Oton", "Iloilo City, Oton and Pavia". */
export function cityList(cities: readonly string[]) {
  return cities.length <= 1 ? (cities[0] ?? "") : `${cities.slice(0, -1).join(", ")} and ${cities[cities.length - 1]}`;
}
