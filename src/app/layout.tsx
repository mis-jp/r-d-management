import type { Metadata } from "next";
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans">
        {children}
        <ThemeToaster />
      </body>
    </html>
  );
}
