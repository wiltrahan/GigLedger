import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { NewInvoiceButton } from "@/components/layout/new-invoice-button";
import { UserMenu } from "@/components/layout/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="dashboard-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <AppSidebar />
        <div className="min-w-0 flex-1 text-slate-100">
          <header className="dashboard-panel flex flex-col gap-4 rounded-[28px] px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[var(--dashboard-accent)]">Studio view</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">GigLedger workspace</h1>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <NewInvoiceButton />
              <UserMenu email={user.email ?? "Unknown"} />
            </div>
          </header>

          <main className="pt-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
