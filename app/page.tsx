import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="rounded-xl border bg-white p-10">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Freelancer Finance</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">GigLedger</h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Keep your gigs, clients, invoices, and tax prep in one place with Supabase auth and an RLS-first data model.
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
