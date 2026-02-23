import { clientCreateSchema } from "@/lib/api/schemas";
import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });

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

  const parsed = clientCreateSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      user_id: user.id
    })
    .select("*")
    .single();

  if (error) return jsonSupabaseError(error);
  return jsonOk(data, 201);
}
