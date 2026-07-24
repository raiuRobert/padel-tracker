import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { I18nProvider } from "@/i18n";
import { DataProvider } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Padel Tracker",
  description: "Fair rotations, live scores and an honest split of the court fee.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Padel" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07090c",
  // The app is used one-handed on a court; accidental pinch-zoom while tapping is a nuisance, but
  // zoom stays available because disabling it outright is an accessibility problem.
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider>
          <DataProvider>
            <ConfirmProvider>
              <div className="mx-auto w-full max-w-lg px-4">
                <div className="flex justify-end pt-3">
                  <LanguageToggle />
                </div>
                <main className="pt-3 pb-4">{children}</main>
              </div>
              <BottomNav />
              <WelcomeDialog />
              <ServiceWorkerRegistration />
            </ConfirmProvider>
          </DataProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
