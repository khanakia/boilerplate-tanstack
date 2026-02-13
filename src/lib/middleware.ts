import { env } from "@/env/server";

/**
 * Internal API guard - validates x-internal-key header.
 * Returns an error Response if unauthorized, or null if valid.
 */
export function guardInternalApi(request: Request): Response | null {
  const internalKey = request.headers.get("x-internal-key");
  const expectedKey = env.INTERNAL_KEY;

  if (!expectedKey) {
    return Response.json(
      { error: "INTERNAL_KEY not configured" },
      { status: 500 },
    );
  }

  if (!internalKey || internalKey !== expectedKey) {
    return Response.json(
      { error: "unauthorized, invalid internal key" },
      { status: 401 },
    );
  }

  return null;
}
