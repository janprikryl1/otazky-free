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
    // Motiv doplní na <html> skript níž, takže se serverové HTML
    // záměrně liší od toho, co vidí React při hydrataci.
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Nastaví motiv ještě před vykreslením, ať nic neproblikne. */}
        {/*
          React ve vývoji upozorní, že se skript při přechodu mezi
          stránkami znovu nespustí – to je v pořádku, motiv stačí
          nastavit při prvním načtení. V produkčním buildu se hlášení
          neobjevuje. `next/script` varuje úplně stejně, jen dvakrát.
        */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: vlastní konstantní skript, žádný vstup od uživatele */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
