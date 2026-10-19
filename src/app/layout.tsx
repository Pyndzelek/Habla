import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AmbientBackground, AppShell } from "@/components/AppShell";
import { THEME_BOOTSTRAP } from "@/lib/theme-script";
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
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full">
        <script
          type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }}
        />
        <AmbientBackground />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
