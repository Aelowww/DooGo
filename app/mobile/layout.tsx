import { LayoutProvider } from "./_components/layout-provider";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <LayoutProvider layout="mobile">{children}</LayoutProvider>;
}
