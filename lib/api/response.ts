import { NextResponse } from "next/server";
import { ZodError } from "zod";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "INTERNAL_ERROR";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(status: number, code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: details ?? null
      }
    },
    { status }
  );
}

export function jsonZodError(error: ZodError) {
  return jsonError(400, "VALIDATION_ERROR", "Invalid request payload.", error.flatten());
}

export function jsonSupabaseError(error: { message: string; code?: string | null; details?: string | null; hint?: string | null }) {
  return jsonError(400, "BAD_REQUEST", error.message, {
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null
  });
}
