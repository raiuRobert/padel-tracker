import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { DataProvider } from "./providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Padel Tracker",
  description: "Fair rotations, live scores and an honest split of the court fee.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Padel" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  // The app is used one-handed on a court; accidental pinch-zoom while tapping scores is a nuisance,
  // but zoom stays available because disabling it outright is an accessibility problem.
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <DataProvider>
          <main className="mx-auto w-full max-w-lg px-4 pt-6 pb-4">{children}</main>
          <BottomNav />
        </DataProvider>
      </body>
    </html>
  );
}
