import { requireUser } from "@/lib/api/auth";
import { paymentCreateSchema, uuidSchema } from "@/lib/api/schemas";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: Context) {
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

  const parsed = paymentCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase, user } = auth;
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,total_cents,status")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (invoiceError) return jsonSupabaseError(invoiceError);
  if (!invoice) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      ...parsed.data,
      user_id: user.id,
      invoice_id: idParsed.data
    })
    .select("*")
    .single();

  if (paymentError) return jsonSupabaseError(paymentError);

  const { data: payments, error: paymentsError } = await supabase.from("payments").select("amount_cents").eq("invoice_id", idParsed.data);
  if (paymentsError) return jsonSupabaseError(paymentsError);

  const paidCents = payments.reduce((sum, row) => sum + row.amount_cents, 0);
  const nextStatus = paidCents >= invoice.total_cents ? "paid" : invoice.status;

  if (nextStatus !== invoice.status) {
    const { error: updateInvoiceError } = await supabase.from("invoices").update({ status: nextStatus }).eq("id", idParsed.data);
    if (updateInvoiceError) return jsonSupabaseError(updateInvoiceError);
  }

  return jsonOk({
    payment,
    invoice_id: idParsed.data,
    paid_cents: paidCents,
    invoice_status: nextStatus
  });
}
