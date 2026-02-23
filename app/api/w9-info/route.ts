import { z } from "zod";

import { requireUser } from "@/lib/api/auth";
import { jsonError, jsonOk, jsonSupabaseError, jsonZodError } from "@/lib/api/response";

const w9InfoSchema = z.object({
  legal_name: z.string().trim().min(1).max(255),
  business_name: z.string().trim().max(255).nullish(),
  tax_classification: z.string().trim().max(120).nullish(),
  tin_last4: z.string().trim().max(4).nullish(),
  address_line1: z.string().trim().max(255).nullish(),
  address_line2: z.string().trim().max(255).nullish(),
  city: z.string().trim().max(120).nullish(),
  state: z.string().trim().max(120).nullish(),
  postal_code: z.string().trim().max(30).nullish(),
  country: z.string().trim().max(120).nullish(),
  email: z.string().email().max(255).nullish(),
  phone: z.string().trim().max(80).nullish(),
  notes: z.string().trim().max(5000).nullish()
});

export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { supabase } = auth;
  const { data, error } = await supabase.from("w9_info").select("*").maybeSingle();

  if (error) return jsonSupabaseError(error);
  return jsonOk(data);
}

export async function PUT(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Request body must be valid JSON.");
  }

  const parsed = w9InfoSchema.safeParse(payload);
  if (!parsed.success) return jsonZodError(parsed.error);

  const { supabase, user } = auth;
  const { data, error } = await supabase
    .from("w9_info")
    .upsert(
      {
        ...parsed.data,
        user_id: user.id
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) return jsonSupabaseError(error);
  return jsonOk(data);
}
