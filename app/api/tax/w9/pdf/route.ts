import { requireUser } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/response";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return jsonError(401, "UNAUTHORIZED", "Missing authenticated session token.");
  }

  const serviceUrl = process.env.GIGLEDGER_SERVICE_URL;
  if (!serviceUrl) {
    return jsonError(500, "INTERNAL_ERROR", "GIGLEDGER_SERVICE_URL is not configured.");
  }

  const endpoint = `${serviceUrl.replace(/\/$/, "")}/api/pdf/w9-info`;
  const upstream = await fetch(endpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/pdf"
    },
    cache: "no-store"
  });

  if (!upstream.ok) {
    if (upstream.status === 404) {
      return jsonError(501, "BAD_REQUEST", "W-9 info PDF export is not implemented in the Kotlin service yet.");
    }

    return jsonError(upstream.status, "BAD_REQUEST", `W-9 PDF service request failed (${upstream.status}).`);
  }

  const pdf = await upstream.arrayBuffer();
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="w9-info-sheet.pdf"',
      "Cache-Control": "no-store"
    }
  });
}
