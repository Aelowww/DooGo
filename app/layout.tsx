import type { Metadata, Viewport } from "next";
import { AuthProvider } from "./_components/auth-provider";
import { IconProvider } from "./_components/icon-provider";
import { LayoutSwitch } from "./_components/layout-switch";
import { ToastProvider } from "./_components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "DooGo",
  description: "Connecting donors. Saving lives.",
};

export const viewport: Viewport = {
  themeColor: "#f8f5f2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <LayoutSwitch />
        <IconProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </IconProvider>
      </body>
    </html>
  );
}
