import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SharedInvoicePayload = {
  invoice: {
    id: string;
    invoice_number: string;
    issue_date?: string | null;
    due_date?: string | null;
    status: string;
    currency: string;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    notes?: string | null;
  };
  client?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    billing_address?: string | null;
  } | null;
  settings?: {
    brand_name?: string | null;
    brand_email?: string | null;
    brand_phone?: string | null;
    brand_address?: string | null;
    payment_instructions?: string | null;
    currency?: string | null;
  } | null;
  line_items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
    service_date?: string | null;
    sort_order?: number;
  }>;
  payments: Array<{
    id: string;
    amount_cents: number;
    payment_date?: string | null;
    method?: string | null;
  }>;
};

type Context = {
  params: Promise<{ token: string }>;
};

function formatCurrency(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function statusPillClass(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return "bg-emerald-100 text-emerald-800";
  if (normalized === "sent") return "bg-blue-100 text-blue-800";
  if (normalized === "overdue") return "bg-amber-100 text-amber-800";
  if (normalized === "void") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-700";
}

function extractPayload(raw: unknown): SharedInvoicePayload | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0] as Record<string, unknown>;
    if (first && typeof first === "object" && "get_shared_invoice_by_token" in first) {
      const nested = first.get_shared_invoice_by_token as SharedInvoicePayload | null;
      return nested;
    }
    return raw[0] as SharedInvoicePayload;
  }
  return raw as SharedInvoicePayload;
}

async function getSharedInvoice(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return { error: "Supabase environment is not configured." as const };
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_shared_invoice_by_token`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ p_token: token }),
    cache: "no-store"
  });

  if (!response.ok) {
    return { error: "Unable to load shared invoice." as const };
  }

  const json = (await response.json()) as unknown;
  const payload = extractPayload(json);

  if (!payload?.invoice?.id) {
    return { notFound: true as const };
  }

  return { payload };
}

export default async function SharedInvoicePage(context: Context) {
  const { token } = await context.params;
  const result = await getSharedInvoice(token);

  if ("notFound" in result) {
    notFound();
  }

  if ("error" in result) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Shared Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{result.error}</p>
            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/">Go Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  const { payload } = result;
  const invoice = payload.invoice;
  const client = payload.client;
  const settings = payload.settings;
  const currency = invoice.currency || settings?.currency || "USD";
  const totalPaid = payload.payments.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const balanceDue = Math.max(invoice.total_cents - totalPaid, 0);

  return (
    <main className="min-h-[calc(100vh-56px)] bg-[radial-gradient(1200px_500px_at_10%_-10%,#dbeafe,transparent),radial-gradient(900px_400px_at_90%_0%,#e2e8f0,transparent)] py-10">
      <div className="mx-auto max-w-5xl px-4">
        <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-300/30">
          <CardHeader className="gap-4 border-b bg-white">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{settings?.brand_name || "GigLedger"}</p>
                <CardTitle className="mt-2 text-3xl tracking-tight text-slate-900">Invoice {invoice.invoice_number}</CardTitle>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusPillClass(invoice.status)}`}>
                    {invoice.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500">Issue: {formatDate(invoice.issue_date)}</span>
                  <span className="text-slate-500">Due: {formatDate(invoice.due_date)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <a href={`/api/public/invoice/${token}/pdf`} target="_blank" rel="noreferrer">
                    Download PDF
                  </a>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 bg-white p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bill To</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{client?.name || "-"}</p>
                {client?.email ? <p className="text-slate-600">{client.email}</p> : null}
                {client?.phone ? <p className="text-slate-600">{client.phone}</p> : null}
                {client?.billing_address ? <p className="text-slate-600">{client.billing_address}</p> : null}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">From</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{settings?.brand_name || "GigLedger"}</p>
                {settings?.brand_email ? <p className="text-slate-600">{settings.brand_email}</p> : null}
                {settings?.brand_phone ? <p className="text-slate-600">{settings.brand_phone}</p> : null}
                {settings?.brand_address ? <p className="text-slate-600">{settings.brand_address}</p> : null}
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.line_items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-800">{item.description}</td>
                      <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(item.unit_price_cents, currency)}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.line_total_cents, currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ml-auto w-full max-w-sm rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.subtotal_cents, currency)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Tax</span>
                <span className="font-medium text-slate-800">{formatCurrency(invoice.tax_cents, currency)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Paid</span>
                <span className="font-medium text-slate-800">{formatCurrency(totalPaid, currency)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-slate-300 pt-2 text-base font-semibold text-slate-900">
                <span>Balance Due</span>
                <span>{formatCurrency(balanceDue, currency)}</span>
              </div>
            </div>

            {settings?.payment_instructions ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Instructions</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{settings.payment_instructions}</p>
              </div>
            ) : null}

            {invoice.notes ? (
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{invoice.notes}</p>
              </div>
            ) : null}

            <div className="pt-2">
              <Button asChild variant="link" className="px-0 text-slate-500">
                <Link href="/">Powered by GigLedger</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
