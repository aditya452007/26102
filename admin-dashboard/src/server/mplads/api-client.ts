/**
 * Server-only FastAPI adapter (never imported by client components).
 *
 * Laws:
 * - One health probe per overview visit, shared single-flight by every data
 *   call in that visit — never one probe per API call.
 * - When the probe says unhealthy, callers must NOT attempt any data fetch.
 * - Every fetch has a hard timeout so a dead backend fails fast to seed.
 */

const API_BASE = (process.env.NIRIKSHAN_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_PREFIX = "/api/v1";
const TIMEOUT_MS = 1500;

// Demo officer for server-side reads (the browser keeps its prototype cookie
// session; the backend needs a real JWT — ministry scope returns everything
// and the existing role lens filters client-side, as today).
const DEMO_EMAIL = process.env.NIRIKSHAN_DEMO_EMAIL ?? "ministry@demo.gov.in";
const DEMO_PASSWORD = process.env.NIRIKSHAN_DEMO_PASSWORD ?? "demo1234";

export class ApiError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null) {
    super(message);
    this.status = status;
  }
}

async function fetchJson(path: string, init?: RequestInit, timeoutMs = TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!response.ok) throw new ApiError(`API ${response.status} on ${path}`, response.status);
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`API unreachable on ${path}: ${error instanceof Error ? error.message : error}`, null);
  } finally {
    clearTimeout(timer);
  }
}

let probeFlight: Promise<boolean> | null = null;

/**
 * True when FastAPI answers /healthz. Single-flight: concurrent callers share
 * the one in-flight probe; the verdict is NOT cached across visits, so starting
 * the backend later is picked up on the next page load.
 */
export function probeBackend(): Promise<boolean> {
  probeFlight ??= fetchJson("/healthz")
    .then((body) => (body as { status?: unknown } | null)?.status === "ok")
    .catch(() => false)
    .finally(() => {
      probeFlight = null;
    });
  return probeFlight;
}

let tokenFlight: Promise<string> | null = null;

function login(): Promise<string> {
  tokenFlight ??= fetchJson(`${API_PREFIX}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  })
    .then((body) => {
      const token = (body as { accessToken?: unknown } | null)?.accessToken;
      if (typeof token !== "string" || token.length === 0) throw new ApiError("Login returned no token", null);
      return token;
    })
    .catch((error: unknown) => {
      tokenFlight = null;
      throw error;
    });
  return tokenFlight;
}

/** Authenticated GET against /api/v1. Retries once with a fresh login on 401. */
export async function apiFetch(path: string): Promise<unknown> {
  const get = (token: string) =>
    fetchJson(`${API_PREFIX}${path}`, { headers: { authorization: `Bearer ${token}` } });
  try {
    return await get(await login());
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    tokenFlight = null;
    return get(await login());
  }
}
