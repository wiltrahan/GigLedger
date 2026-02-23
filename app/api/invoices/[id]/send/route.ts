import { randomUUID } from "node:crypto";

import { requireUser } from "@/lib/api/auth";
import { uuidSchema } from "@/lib/api/schemas";
import { jsonError, jsonOk, jsonSupabaseError } from "@/lib/api/response";

type Context = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid invoice id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase, user } = auth;

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("id,status")
    .eq("id", idParsed.data)
    .maybeSingle();

  if (invoiceError) return jsonSupabaseError(invoiceError);
  if (!invoice) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  const token = randomUUID().replaceAll("-", "");

  const { error: revokeError } = await supabase
    .from("invoice_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("invoice_id", idParsed.data)
    .is("revoked_at", null);

  if (revokeError) return jsonSupabaseError(revokeError);

  const { data: share, error: shareError } = await supabase
    .from("invoice_shares")
    .insert({
      user_id: user.id,
      invoice_id: idParsed.data,
      token
    })
    .select("id,token,created_at")
    .single();

  if (shareError) return jsonSupabaseError(shareError);

  if (invoice.status !== "paid") {
    const { error: updateInvoiceError } = await supabase.from("invoices").update({ status: "sent" }).eq("id", idParsed.data);
    if (updateInvoiceError) return jsonSupabaseError(updateInvoiceError);
  }

  return jsonOk({
    invoice_id: idParsed.data,
    status: invoice.status === "paid" ? "paid" : "sent",
    share: {
      ...share,
      url_path: `/i/${share.token}`
    }
  });
}
