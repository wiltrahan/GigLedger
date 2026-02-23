import { computeTotals, normalizeLineItems } from "@/lib/api/invoice-totals";
import { requireUser } from "@/lib/api/auth";
import { invoiceCreateSchema, invoiceStatusFilterSchema } from "@/lib/api/schemas";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

const invoiceSelect = "*, clients(id,name,email), invoice_line_items(*), payments(*)";

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const statusRaw = new URL(request.url).searchParams.get("status") ?? undefined;
  const status = invoiceStatusFilterSchema.safeParse(statusRaw);
  if (!status.success) return jsonError(400, "VALIDATION_ERROR", "Invalid invoice status filter.", status.error.flatten());

  const { supabase } = auth;
  let query = supabase.from("invoices").select(invoiceSelect).order("issue_date", { ascending: false });
  if (status.data) query = query.eq("status", status.data);

  const { data, error } = await query;
  if (error) return jsonSupabaseError(error);

  return jsonOk(data);
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = invoiceCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { line_items, tax_rate_percent, tax_cents, ...invoiceInput } = parsed.data;
  const normalizedLineItems = normalizeLineItems(line_items);
  const totals = computeTotals(normalizedLineItems, tax_rate_percent, tax_cents);

  const { supabase, user } = auth;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({
      ...invoiceInput,
      user_id: user.id,
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      total_cents: totals.total_cents
    })
    .select("id")
    .single();

  if (invoiceError) return jsonSupabaseError(invoiceError);

  const { error: lineItemError } = await supabase.from("invoice_line_items").insert(
    normalizedLineItems.map((item) => ({
      ...item,
      user_id: user.id,
      invoice_id: invoice.id
    }))
  );

  if (lineItemError) return jsonSupabaseError(lineItemError);

  const { data, error } = await supabase.from("invoices").select(invoiceSelect).eq("id", invoice.id).single();
  if (error) return jsonSupabaseError(error);

  return jsonOk(data, 201);
}
