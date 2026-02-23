import { z } from "zod";

import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk, jsonSupabaseError } from "@/lib/api/response";

const yearSchema = z.coerce.number().int().min(2000).max(2100);

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const rawYear = new URL(request.url).searchParams.get("year") ?? String(new Date().getFullYear());
  const parsedYear = yearSchema.safeParse(rawYear);
  if (!parsedYear.success) return jsonError(400, "VALIDATION_ERROR", "Invalid year filter.", parsedYear.error.flatten());

  const year = parsedYear.data;
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;

  const { supabase } = auth;

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("amount_cents,payment_date,invoice_id")
    .gte("payment_date", start)
    .lt("payment_date", end);

  if (paymentsError) return jsonSupabaseError(paymentsError);

  const totalEarnedCents = payments.reduce((sum, payment) => sum + payment.amount_cents, 0);

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id,total_cents,status,issue_date")
    .gte("issue_date", start)
    .lt("issue_date", end);

  if (invoicesError) return jsonSupabaseError(invoicesError);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  let invoicePaymentsById = new Map<string, number>();

  if (invoiceIds.length > 0) {
    const { data: invoicePayments, error: invoicePaymentsError } = await supabase
      .from("payments")
      .select("invoice_id,amount_cents")
      .in("invoice_id", invoiceIds);

    if (invoicePaymentsError) return jsonSupabaseError(invoicePaymentsError);

    invoicePaymentsById = invoicePayments.reduce((map, row) => {
      map.set(row.invoice_id, (map.get(row.invoice_id) ?? 0) + row.amount_cents);
      return map;
    }, new Map<string, number>());
  }

  const outstandingCents = invoices.reduce((sum, invoice) => {
    if (invoice.status === "void") return sum;
    const paidCents = invoicePaymentsById.get(invoice.id) ?? 0;
    const remaining = Math.max(invoice.total_cents - paidCents, 0);
    return sum + remaining;
  }, 0);

  return jsonOk({
    year,
    total_earned_cents: totalEarnedCents,
    outstanding_cents: outstandingCents,
    payment_count: payments.length,
    invoice_count: invoices.length
  });
}
