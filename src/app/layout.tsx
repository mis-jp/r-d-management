import type { Metadata } from "next";
import { ThemeToaster } from "@/components/theme/theme-toaster";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "R&D Management", template: "%s · R&D Management" },
  description: "Task management for the Research & Development department.",
  icons: { icon: "/brand/rd-management-mark.webp" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
