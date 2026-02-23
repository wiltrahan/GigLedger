"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type W9Info = {
  legal_name: string;
  business_name: string;
  tax_classification: string;
  tin_last4: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  email: string;
  phone: string;
  notes: string;
};

type TaxSummary = {
  year: number;
  total_earned_cents: number;
  outstanding_cents: number;
  payment_count: number;
  invoice_count: number;
};

type ApiErrorResponse = {
  error?: {
    message?: string;
    details?: {
      formErrors?: string[];
      fieldErrors?: Record<string, string[] | undefined>;
    } | null;
  };
};

const emptyW9: W9Info = {
  legal_name: "",
  business_name: "",
  tax_classification: "",
  tin_last4: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  email: "",
  phone: "",
  notes: ""
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function extractApiErrorMessage(payload: ApiErrorResponse | undefined, fallback: string) {
  const baseMessage = payload?.error?.message ?? fallback;
  const details = payload?.error?.details;

  if (!details) return baseMessage;

  const formMessage = details.formErrors?.find((message) => Boolean(message?.trim()));
  if (formMessage) return formMessage;

  const fieldEntries = Object.entries(details.fieldErrors ?? {});
  for (const [field, messages] of fieldEntries) {
    const first = messages?.find((message) => Boolean(message?.trim()));
    if (first) return `${field}: ${first}`;
  }

  return baseMessage;
}

export function TaxClient() {
  const [w9, setW9] = useState<W9Info>(emptyW9);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loadingW9, setLoadingW9] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [savingW9, setSavingW9] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => current - index);
  }, []);

  const loadW9 = useCallback(async () => {
    setLoadingW9(true);

    const response = await fetch("/api/w9-info", { cache: "no-store" });
    const json = (await response.json()) as ApiErrorResponse & { data?: Partial<W9Info> | null };

    if (!response.ok) {
      setError(extractApiErrorMessage(json, "Failed to load W-9 info."));
      setLoadingW9(false);
      return;
    }

    if (json.data) {
      setW9({
        legal_name: json.data.legal_name ?? "",
        business_name: json.data.business_name ?? "",
        tax_classification: json.data.tax_classification ?? "",
        tin_last4: json.data.tin_last4 ?? "",
        address_line1: json.data.address_line1 ?? "",
        address_line2: json.data.address_line2 ?? "",
        city: json.data.city ?? "",
        state: json.data.state ?? "",
        postal_code: json.data.postal_code ?? "",
        country: json.data.country ?? "",
        email: json.data.email ?? "",
        phone: json.data.phone ?? "",
        notes: json.data.notes ?? ""
      });
    }

    setLoadingW9(false);
  }, []);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);

    const response = await fetch(`/api/tax/summary?year=${year}`, { cache: "no-store" });
    const json = (await response.json()) as ApiErrorResponse & { data?: TaxSummary };

    if (!response.ok) {
      setError(extractApiErrorMessage(json, "Failed to load yearly totals."));
      setLoadingSummary(false);
      return;
    }

    setSummary(json.data ?? null);
    setLoadingSummary(false);
  }, [year]);

  useEffect(() => {
    void loadW9();
  }, [loadW9]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  async function saveW9() {
    setSavingW9(true);
    setError(null);
    setSuccess(null);

    const response = await fetch("/api/w9-info", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(w9)
    });

    const json = (await response.json()) as ApiErrorResponse;
    if (!response.ok) {
      setError(extractApiErrorMessage(json, "Failed to save W-9 info."));
      setSavingW9(false);
      return;
    }

    setSuccess("W-9 info saved.");
    setSavingW9(false);
  }

  async function exportW9Pdf() {
    setExporting(true);
    setError(null);

    const response = await fetch("/api/tax/w9/pdf", {
      method: "GET"
    });

    if (!response.ok) {
      let message = "Failed to export W-9 info sheet PDF.";
      try {
        const json = (await response.json()) as ApiErrorResponse;
        message = extractApiErrorMessage(json, message);
      } catch {
        // ignore parse errors
      }
      setError(message);
      setExporting(false);
      return;
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setExporting(false);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>W-9 Info (Info Sheet)</CardTitle>
          <Button variant="outline" disabled={exporting} onClick={() => void exportW9Pdf()}>
            {exporting ? "Exporting..." : "Export W-9 info sheet PDF"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">This stores reference information only and does not generate an official IRS W-9 form.</p>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
          {loadingW9 ? <p className="text-sm text-muted-foreground">Loading W-9 info...</p> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Legal Name</span>
              <Input value={w9.legal_name} onChange={(event) => setW9({ ...w9, legal_name: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Business Name</span>
              <Input value={w9.business_name} onChange={(event) => setW9({ ...w9, business_name: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Tax Classification</span>
              <Input value={w9.tax_classification} onChange={(event) => setW9({ ...w9, tax_classification: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">TIN Last 4</span>
              <Input value={w9.tin_last4} onChange={(event) => setW9({ ...w9, tin_last4: event.target.value })} maxLength={4} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Address Line 1</span>
              <Input value={w9.address_line1} onChange={(event) => setW9({ ...w9, address_line1: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Address Line 2</span>
              <Input value={w9.address_line2} onChange={(event) => setW9({ ...w9, address_line2: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">City</span>
              <Input value={w9.city} onChange={(event) => setW9({ ...w9, city: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">State</span>
              <Input value={w9.state} onChange={(event) => setW9({ ...w9, state: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Postal Code</span>
              <Input value={w9.postal_code} onChange={(event) => setW9({ ...w9, postal_code: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Country</span>
              <Input value={w9.country} onChange={(event) => setW9({ ...w9, country: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Email</span>
              <Input value={w9.email} onChange={(event) => setW9({ ...w9, email: event.target.value })} />
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium">Phone</span>
              <Input value={w9.phone} onChange={(event) => setW9({ ...w9, phone: event.target.value })} />
            </label>
          </div>

          <label className="block space-y-2 text-sm">
            <span className="font-medium">Notes</span>
            <Textarea value={w9.notes} onChange={(event) => setW9({ ...w9, notes: event.target.value })} />
          </label>

          <div className="flex justify-end">
            <Button disabled={savingW9 || !w9.legal_name.trim()} onClick={() => void saveW9()}>
              {savingW9 ? "Saving..." : "Save W-9 Info"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Yearly Totals</CardTitle>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          >
            {years.map((entryYear) => (
              <option key={entryYear} value={entryYear}>
                {entryYear}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {loadingSummary ? <p className="text-sm text-muted-foreground">Loading totals...</p> : null}

          {summary ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Total earned ({summary.year})</p>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.total_earned_cents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Based on payment records in the selected year.</p>
              </div>

              <div className="rounded-md border bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding invoices ({summary.year})</p>
                <p className="mt-2 text-3xl font-semibold">{formatCurrency(summary.outstanding_cents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Open balance from invoices issued in the selected year.</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
