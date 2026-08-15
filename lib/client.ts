import { ClientMemory } from "@/lib/serialize";

const LS_KEY = "agenthack_sales_client_state";

export async function fetchState(): Promise<ClientMemory> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load state");
  const data = (await res.json()) as ClientMemory;

  if (data.leads.length === 0 && !data.company && typeof window !== "undefined") {
    const cached = localStorage.getItem(LS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.leads?.length > 0) {
          await fetch("/api/state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ restore: true, state: parsed }),
          });
          return parsed;
        }
      } catch {
        /* ignore bad cache */
      }
    }
  }
  return data;
}

export function cacheState(state: ClientMemory) {
  if (typeof window !== "undefined") {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }
}

export async function post<T = ClientMemory>(url: string, body?: unknown): Promise<{ ok: boolean; error?: string; state?: T }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, error: data.error || "Request failed" };
  return data;
}
