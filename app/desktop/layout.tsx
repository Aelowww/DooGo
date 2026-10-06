import { LayoutProvider } from "@/app/mobile/_components/layout-provider";

// Desktop pages re-export the screens in app/mobile; the shared Screen component renders the
// desktop shell (sidebar / split sign-in) when it sees this provider.
export default function DesktopLayout({ children }: { children: React.ReactNode }) {
  return <LayoutProvider layout="desktop">{children}</LayoutProvider>;
}
