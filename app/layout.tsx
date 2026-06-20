import type { Metadata } from "next";

import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

import "./globals.css";

export const metadata: Metadata = {
  title: "NS SYSTEM Next",
  description: "NS SYSTEM migration to Next.js + MySQL + Railway License DB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <SiteHeader />
          <div className="app-shell__content">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
