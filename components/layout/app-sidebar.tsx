import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/gigs", label: "Gigs" },
  { href: "/clients", label: "Clients" },
  { href: "/invoices", label: "Invoices" },
  { href: "/tax", label: "Tax" },
  { href: "/settings", label: "Settings" }
];

export function AppSidebar() {
  return (
    <aside className="hidden w-64 border-r bg-white md:block">
      <div className="p-4 text-sm font-medium text-slate-500">Workspace</div>
      <nav className="space-y-1 p-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
