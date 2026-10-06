import { redirect } from "next/navigation";

/** Availability now lives on the Donating page; keep old links working. */
export default function ManageStatusPage() {
  redirect("/donate");
}
