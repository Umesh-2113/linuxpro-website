type ApiError = { error?: string; message?: string };

function buildHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {};
  if (
    typeof window !== "undefined" &&
    sessionStorage.getItem("linuxpro_admin") === "true"
  ) {
    headers["x-linuxpro-admin"] = "true";
  }
  return { ...headers, ...extra };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiError;
    return data.error || data.message || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, {
    cache: "no-store",
    credentials: "include",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    credentials: "include",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(path, {
    method: "DELETE",
    credentials: "include",
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
