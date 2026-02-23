import { jsonError } from "@/lib/api/response";

type Context = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;

  if (!token || token.trim().length < 8) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid invoice share token.");
  }

  const serviceUrl = process.env.GIGLEDGER_SERVICE_URL;
  if (!serviceUrl) {
    return jsonError(500, "INTERNAL_ERROR", "GIGLEDGER_SERVICE_URL is not configured.");
  }

  const endpoint = `${serviceUrl.replace(/\/$/, "")}/public/invoice/${encodeURIComponent(token)}/pdf`;
  const upstream = await fetch(endpoint, {
    method: "GET",
    headers: {
      Accept: "application/pdf"
    },
    cache: "no-store"
  });

  if (!upstream.ok) {
    return jsonError(upstream.status, "BAD_REQUEST", `PDF service failed (${upstream.status}).`);
  }

  const bytes = await upstream.arrayBuffer();
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="invoice-${token}.pdf"`,
      "Cache-Control": "no-store"
    }
  });
}
