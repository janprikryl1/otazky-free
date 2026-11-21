import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Narozeninový kvíz",
    template: "%s · Narozeninový kvíz",
  },
  description:
    "Živý narozeninový kvíz pro desítky hostů – připoj se telefonem, odpovídej a soutěž o první místo.",
  applicationName: "Narozeninový kvíz",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1b1033",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Motiv doplní na <html> skript níž, takže se serverové HTML
    // záměrně liší od toho, co vidí React při hydrataci.
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Nastaví motiv ještě před vykreslením, ať nic neproblikne. */}
        <Script id="motiv" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
