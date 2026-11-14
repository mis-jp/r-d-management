import type { Metadata } from "next";
import { ThemeToaster } from "@/components/theme/theme-toaster";
import { THEME_INIT_SCRIPT } from "@/components/theme/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "R&D Task Management", template: "%s · R&D Tasks" },
  description: "Task management for the Research & Development department.",
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
