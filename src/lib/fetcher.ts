const GENERIC_ERROR =
  "Nepodařilo se spojit se serverem. Zkontroluj připojení a zkus to znovu.";

const OFFLINE_ERROR =
  "Jsi offline. Jakmile se připojení obnoví, hra bude pokračovat.";

export class ApiRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiRequestError";
  }
}

/** True when the moderator cookie expired and a new sign-in is needed. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

async function parseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function messageFrom(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiRequestError(offline() ? OFFLINE_ERROR : GENERIC_ERROR, 0);
  }

  const data = await parseBody(response);

  if (!response.ok) {
    throw new ApiRequestError(
      messageFrom(data, GENERIC_ERROR),
      response.status,
    );
  }

  return data as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiSend<T>(
  url: string,
  body?: unknown,
  method: "POST" | "PATCH" | "DELETE" = "POST",
): Promise<T> {
  return request<T>(url, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : GENERIC_ERROR;
}
