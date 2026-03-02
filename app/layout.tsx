import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "GigLedger",
  description: "Track gigs, clients, invoices, and taxes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
