"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { usePathname } from "next/navigation";

export function NewInvoiceButton() {
  const pathname = usePathname();
  const href = pathname === "/dashboard" ? "/dashboard?newInvoice=1" : "/invoices?new=1";

  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--dashboard-accent)] px-5 text-sm font-medium text-slate-950 transition hover:bg-[var(--dashboard-accent-strong)]"
    >
      <Plus className="mr-2 h-4 w-4" />
      New invoice
    </Link>
  );
}
