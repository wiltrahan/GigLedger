import { requireUser } from "@/lib/api/auth";
import { uuidSchema } from "@/lib/api/schemas";
import { jsonError, jsonSupabaseError } from "@/lib/api/response";

type Context = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid invoice id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const { data: invoice, error } = await supabase.from("invoices").select("id,invoice_number").eq("id", idParsed.data).maybeSingle();

  if (error) return jsonSupabaseError(error);
  if (!invoice) return jsonError(404, "NOT_FOUND", "Invoice not found.");

  const serviceUrl = process.env.GIGLEDGER_SERVICE_URL;
  if (!serviceUrl) {
    return jsonError(500, "INTERNAL_ERROR", "GIGLEDGER_SERVICE_URL is not configured.");
  }

  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return jsonError(401, "UNAUTHORIZED", "Missing authenticated session token.");
  }

  const endpoint = `${serviceUrl.replace(/\/$/, "")}/api/pdf/invoice/${invoice.id}`;
  const serviceResponse = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/pdf"
    },
    cache: "no-store"
  });

  if (!serviceResponse.ok) {
    let message = `PDF service request failed (${serviceResponse.status}).`;
    try {
      const serviceJson = (await serviceResponse.json()) as { error?: { message?: string } };
      message = serviceJson.error?.message ?? message;
    } catch {
      // Ignore JSON parse failure and keep default error message.
    }
    return jsonError(serviceResponse.status, "BAD_REQUEST", message);
  }

  const pdf = await serviceResponse.arrayBuffer();
  const fileName = `invoice-${invoice.invoice_number}.pdf`;
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${fileName}\"`,
      "Cache-Control": "no-store"
    }
  });
}
