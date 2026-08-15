export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

const SEARCH_KEY = process.env.BRAVE_API_KEY || process.env.SERPER_API_KEY;
const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || (process.env.BRAVE_API_KEY ? "brave" : process.env.SERPER_API_KEY ? "serper" : "none");

export function hasWebSearch(): boolean {
  return SEARCH_PROVIDER !== "none" && !!SEARCH_KEY;
}

export async function webSearch(query: string, count = 5): Promise<WebResult[]> {
  if (!hasWebSearch()) return [];
  if (SEARCH_PROVIDER === "brave") {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
      headers: { "X-Subscription-Token": SEARCH_KEY! },
    });
    if (!res.ok) throw new Error(`Brave search error ${res.status}`);
    const data = await res.json();
    return (data.web?.results ?? []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));
  }
  if (SEARCH_PROVIDER === "serper") {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SEARCH_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: count }),
    });
    if (!res.ok) throw new Error(`Serper search error ${res.status}`);
    const data = await res.json();
    return (data.organic ?? []).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  }
  return [];
}
