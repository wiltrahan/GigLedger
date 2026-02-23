import { computeTotals, normalizeLineItems } from "@/lib/api/invoice-totals";
import { requireUser } from "@/lib/api/auth";
import { invoiceUpdateSchema, uuidSchema } from "@/lib/api/schemas";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

type Context = {
  params: Promise<{ id: string }>;
};

const invoiceSelect = "*, clients(id,name,email), invoice_line_items(*), payments(*)";

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid invoice id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = invoiceUpdateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase, user } = auth;
  const { data: existingInvoice, error: existingInvoiceError } = await supabase
    .from("invoices")
    .select("id,tax_cents")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (existingInvoiceError) return jsonSupabaseError(existingInvoiceError);
  if (!existingInvoice) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  const { line_items, tax_rate_percent, tax_cents, ...invoiceInput } = parsed.data;

  let workingLineItems: Array<{ line_total_cents: number; description: string; quantity: number; unit_price_cents: number; service_date: string | null | undefined; sort_order: number }> = [];

  if (line_items) {
    workingLineItems = normalizeLineItems(line_items);
  } else {
    const { data: existingLineItems, error: existingLineItemsError } = await supabase
      .from("invoice_line_items")
      .select("line_total_cents,description,quantity,unit_price_cents,service_date,sort_order")
      .eq("invoice_id", idParsed.data)
      .order("sort_order", { ascending: true });

    if (existingLineItemsError) return jsonSupabaseError(existingLineItemsError);
    workingLineItems = existingLineItems;
  }

  const totals = computeTotals(workingLineItems, tax_rate_percent, tax_cents, existingInvoice.tax_cents);

  const { error: updateInvoiceError } = await supabase
    .from("invoices")
    .update({
      ...invoiceInput,
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      total_cents: totals.total_cents
    })
    .eq("id", idParsed.data);

  if (updateInvoiceError) return jsonSupabaseError(updateInvoiceError);

  if (line_items) {
    const { error: deleteItemsError } = await supabase.from("invoice_line_items").delete().eq("invoice_id", idParsed.data);
    if (deleteItemsError) return jsonSupabaseError(deleteItemsError);

    const { error: insertItemsError } = await supabase.from("invoice_line_items").insert(
      workingLineItems.map((item) => ({
        ...item,
        user_id: user.id,
        invoice_id: idParsed.data
      }))
    );

    if (insertItemsError) return jsonSupabaseError(insertItemsError);
  }

  const { data, error } = await supabase.from("invoices").select(invoiceSelect).eq("id", idParsed.data).maybeSingle();
  if (error) return jsonSupabaseError(error);
  if (!data) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  return jsonOk(data);
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid invoice id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const { data, error } = await supabase.from("invoices").delete().eq("id", idParsed.data).select("id").maybeSingle();

  if (error) return jsonSupabaseError(error);
  if (!data) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  return jsonOk({ id: data.id });
}
