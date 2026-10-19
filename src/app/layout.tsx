import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AmbientBackground, AppShell } from "@/components/AppShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Habla", template: "%s · Habla" },
  description: "Learn Spanish — flashcards, typing practice and spaced repetition.",
  appleWebApp: { capable: true, title: "Habla", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AmbientBackground />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
