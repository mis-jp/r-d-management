import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Manrope } from "next/font/google";
import { ThemeToaster } from "@/components/theme/theme-toaster";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-script";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-login-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "R&D Management", template: "%s · R&D Management" },
  description: "Task management for the Research & Development department.",
  icons: { icon: "/brand/rd-management-mark.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans">
        {/* beforeInteractive injects into <head> and runs before hydration to avoid a theme flash. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
        <ThemeToaster />
      </body>
    </html>
  );
}
