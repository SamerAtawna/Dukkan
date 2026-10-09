import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodType } from "zod";
import { ConfigError } from "@/lib/server/db";
import { PayPalError } from "@/lib/server/paypal";

/** JSON response helpers for route handlers. */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string
  ) {
    super(message);
  }
}

export const notFound = (what = "Not found") => new HttpError(404, what);
export const badRequest = (msg: string) => new HttpError(400, msg);

export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) } });
}

/** Turn any thrown error into a JSON error response with a sensible status. */
export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, { status: err.status });
  if (err instanceof ConfigError) return json({ error: err.message, code: "NOT_CONFIGURED" }, { status: 503 });
  if (err instanceof PayPalError) {
    console.error("[paypal]", err.status, err.body);
    return json({ error: err.message, code: err.code ?? "PAYPAL_ERROR", detail: safeJson(err.body) }, { status: 502 });
  }
  if (err instanceof ZodError) return json({ error: "Invalid request", issues: err.issues }, { status: 400 });
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  return json({ error: message }, { status: 500 });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

/** Wrap a handler so thrown errors become JSON responses. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err); // Next's own control-flow errors (prerender bailouts) must pass through
      return errorResponse(err);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Body must be JSON");
  }
  return schema.parse(raw);
}

/** Absolute URL for links we hand to buyers and agents. */
export function appUrl(req: Request, path = "/") {
  const configured = process.env.APP_URL?.replace(/\/$/, "");
  const base = configured || new URL(req.url).origin;
  return `${base}${path}`;
}
