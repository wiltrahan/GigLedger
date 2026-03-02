"use client";

import Link from "next/link";
import { CalendarRange, FileText, LayoutDashboard, ReceiptText, Settings, Users } from "lucide-react";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/gigs", label: "Gigs", icon: CalendarRange },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/tax", label: "Tax", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-panel hidden w-64 shrink-0 rounded-[28px] p-4 text-slate-100 lg:block">
      <div className="px-2 pb-4 pt-2">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--dashboard-accent)]">GigLedger</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">Workspace</h2>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              pathname === item.href
                ? "dashboard-accent-glow bg-[linear-gradient(90deg,rgba(100,245,210,0.96),rgba(53,224,196,0.78))] text-slate-950"
                : "border border-transparent text-slate-300 hover:border-[var(--dashboard-border)] hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
