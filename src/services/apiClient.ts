/**
 * Cliente HTTP interno.
 *
 * 🔐 SEGURANÇA:
 * - Em desenvolvimento aponta para o backend local configurado em
 *   `VITE_API_URL` (fallback: `http://localhost:3001`).
 * - Em produção usa a mesma origem (`/api`), preservando o padrão do projeto.
 * - Nunca importa SDKs de provedores externos.
 * - Em DEV anexa apenas headers de autenticação local para o backend resolver
 *   o tenant/RBAC seguro.
 */

const DEV_API_BASE = "http://localhost:3001";
const PROD_API_BASE = "/api";
const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? DEV_API_BASE)
  : PROD_API_BASE;

const DEV_AUTH_HEADERS = import.meta.env.DEV
  ? {
      "x-dev-user-id": "user_demo_cubo_ai_studio",
      "x-dev-user-email": "demo@cubo.chat",
    }
  : {};

export type ApiProviderError = {
  message?: string;
  type?: string;
  code?: string;
  param?: string;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details: {
      providerStatus?: number;
      providerError?: ApiProviderError;
    } = {},
  ) {
    super(message);
  }
}

function buildNetworkErrorMessage(requestUrl: string): string {
  return `Não foi possível conectar ao backend em ${requestUrl}. Verifique se você rodou: npm run api:start`;
}

function extractErrorResponse(
  body: string,
  fallback: string,
): {
  message: string;
  providerStatus?: number;
  providerError?: ApiProviderError;
} {
  if (!body.trim()) {
    return { message: fallback };
  }

  try {
    const parsed = JSON.parse(body) as {
      message?: unknown;
      error?: unknown;
      providerStatus?: unknown;
      providerError?: unknown;
    };
    const providerError = isProviderError(parsed.providerError) ? parsed.providerError : undefined;
    const providerStatus =
      typeof parsed.providerStatus === "number" ? parsed.providerStatus : undefined;

    if (Array.isArray(parsed.message)) {
      return { message: parsed.message.join(" "), providerStatus, providerError };
    }

    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return { message: parsed.message, providerStatus, providerError };
    }

    if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
      return { message: parsed.error, providerStatus, providerError };
    }
  } catch {
    return { message: body };
  }

  return { message: fallback };
}

function isProviderError(value: unknown): value is ApiProviderError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return ["message", "type", "code", "param"].every(
    (key) => candidate[key] === undefined || typeof candidate[key] === "string",
  );
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { headers: initHeaders, ...restInit } = init;
  const headers = new Headers(initHeaders ?? {});

  for (const [key, value] of Object.entries(DEV_AUTH_HEADERS)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  const hasBody = init.body != null && init.body !== undefined;
  if (hasBody && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestUrl =
    path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;

  let res: Response;

  try {
    res = await fetch(requestUrl, {
      credentials: "include",
      headers,
      ...restInit,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }

    throw new ApiError(0, buildNetworkErrorMessage(requestUrl));
  }

  if (!res.ok) {
    let body = "";

    try {
      body = await res.text();
    } catch {
      body = "";
    }

    const errorResponse = extractErrorResponse(body, res.statusText);
    throw new ApiError(res.status, errorResponse.message, {
      providerStatus: errorResponse.providerStatus,
      providerError: errorResponse.providerError,
    });
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }

  return (await res.text()) as T;
}

export function buildApiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://") ? path : `${API_BASE}${path}`;
}

/** Helper para simular chamadas durante o MVP mockado. */
export function mockDelay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
