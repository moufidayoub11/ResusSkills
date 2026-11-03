import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ResusSkills - Quiz Médical",
    template: "%s | ResusSkills",
  },
  description: "ResusSkills — Train, Learn, Save Lives. Plateforme de quiz médical gamifié pour former et évaluer les professionnels de santé.",
  keywords: ["résuscitation", "quiz médical", "formation", "urgence", "résilience"],
  authors: [{ name: "ResusSkills Team" }],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ResusSkills",
  },
  openGraph: {
    title: "ResusSkills - Quiz Médical",
    description: "ResusSkills — Quiz gamifié pour améliorer les compétences en réanimation et prise en charge des chocs.",
    type: "website",
    locale: "fr_FR",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
