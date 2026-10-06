import { SessionGate } from "@/app/mobile/_components/session";

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <SessionGate>{children}</SessionGate>;
}
