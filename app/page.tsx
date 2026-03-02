import Link from "next/link";
import { ArrowRight, CalendarRange, ReceiptText } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16">
      <div className="dashboard-panel-strong rounded-[32px] px-8 py-10 text-slate-100 sm:px-12 sm:py-14">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <p className="text-sm uppercase tracking-[0.32em] text-[var(--dashboard-accent)]">Freelancer Finance</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">GigLedger</h1>
          </div>
          <div className="hidden rounded-full border border-[var(--dashboard-border)] bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300 md:block">
            Ops-ready workspace
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
          <div>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              Track gigs, clients, invoices, and tax prep in a dashboard that feels closer to a control room than a spreadsheet.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="h-11 rounded-full bg-[var(--dashboard-accent)] px-6 text-slate-950 hover:bg-[var(--dashboard-accent-strong)]">
                <Link href="/login">
                  Sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="h-11 rounded-full border-white/15 bg-white/5 px-6 text-slate-100 hover:bg-white/10 hover:text-white"
              >
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-slate-300">
            <div className="dashboard-panel rounded-[26px] p-5">
              <div className="flex items-center gap-3 text-[var(--dashboard-accent)]">
                <CalendarRange className="h-5 w-5" />
                <span className="uppercase tracking-[0.22em]">Upcoming gigs</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">Keep the next set visible.</p>
            </div>
            <div className="dashboard-panel rounded-[26px] p-5">
              <div className="flex items-center gap-3 text-[var(--dashboard-accent)]">
                <ReceiptText className="h-5 w-5" />
                <span className="uppercase tracking-[0.22em]">Collections</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">Invoice flow without context switching.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
