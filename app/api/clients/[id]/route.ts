import { clientUpdateSchema, uuidSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid client id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = clientUpdateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase } = auth;
  const { data, error } = await supabase.from("clients").update(parsed.data).eq("id", idParsed.data).select("*").maybeSingle();

  if (error) return jsonSupabaseError(error);
  if (!data) return jsonError(404, "NOT_FOUND", "Client not found.");

  return jsonOk(data);
}

export async function DELETE(_request: Request, context: Context) {
  const { id } = await context.params;
  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) return jsonError(400, "VALIDATION_ERROR", "Invalid client id.", idParsed.error.flatten());

  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const { data, error } = await supabase.from("clients").delete().eq("id", idParsed.data).select("id").maybeSingle();

  if (error) return jsonSupabaseError(error);
  if (!data) return jsonError(404, "NOT_FOUND", "Client not found.");

  return jsonOk({ id: data.id });
}
