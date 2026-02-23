import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "GigLedger",
  description: "Track gigs, clients, invoices, and taxes."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-slate-50">
          <header className="border-b bg-white">
            <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
              <Link href="/" className="font-semibold tracking-tight">
                GigLedger
              </Link>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
