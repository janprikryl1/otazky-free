import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { THEME_SCRIPT } from "@/lib/theme";

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
    // The script below sets data-theme on <html>, so the server HTML is
    // meant to differ from what React expects on hydration.
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/*
          Applies the theme before first paint. In development React notes
          that the script will not re-run on client navigation, which is
          fine — the theme only needs setting on load. The notice does not
          appear in a production build, and next/script logs it twice.
        */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant script, no user input */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
