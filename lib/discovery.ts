import { Memory, Lead, Stage, EvidenceItem } from "./types";
import { DEMO_LEADS, DemoLeadSeed } from "./demoLeads";
import { chatJSON } from "./llm";
import { uid, logActivity } from "./storage";
import { webSearch, hasWebSearch } from "./search";

export interface Candidate {
  company: string;
  website?: string;
  location?: string;
  industry?: string;
  size?: string;
  description?: string;
  whatsapp?: string;
  source: "search" | "vendor" | "demo";
  sourceLabel: string;
}

export async function discoverCandidates(mem: Memory, mode: "demo" | "vendor" | "search", vendorText?: string): Promise<Candidate[]> {
  if (mode === "demo") {
    return DEMO_LEADS.map((d) => seedToCandidate(d, "demo"));
  }
  if (mode === "vendor") {
    if (!vendorText?.trim()) throw new Error("Paste your list of companies to use vendor mode.");
    const lines = vendorText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out: Candidate[] = [];
    for (const line of lines) {
      const parts = line.split(/[|,;]\s*/).map((p) => p.trim());
      const [company, location, industry, size] = parts;
      out.push({
        company,
        location: location || undefined,
        industry: industry || undefined,
        size: size || undefined,
        description: line,
        source: "vendor",
        sourceLabel: "Vendor / manual list",
      });
    }
    return out;
  }
  if (mode === "search") {
    if (!hasWebSearch()) throw new Error("Web search requires BRAVE_API_KEY or SERPER_API_KEY. Use Demo or Vendor mode instead.");
    const icp = mem.icp;
    const queries: string[] = [];
    const base = [icp?.industry, icp?.location].filter(Boolean).join(" ");
    const kw = icp?.keywords?.slice(0, 6) ?? [];
    kw.forEach((k) => queries.push(`${k} ${base}`.trim()));
    if (queries.length === 0) queries.push(`companies ${base}`.trim());
    const seen = new Map<string, Candidate>();
    for (const q of queries.slice(0, 6)) {
      const results = await webSearch(q, 5);
      for (const r of results) {
        const domain = domainFromUrl(r.url);
        if (!domain || seen.has(domain)) continue;
        seen.set(domain, {
          company: cleanCompanyName(r.title),
          website: domain,
          description: r.snippet,
          source: "search",
          sourceLabel: `Web search: "${q}"`,
        });
      }
    }
    return [...seen.values()];
  }
  return [];
}

function seedToCandidate(d: DemoLeadSeed, mode: Candidate["source"]): Candidate {
  return {
    company: d.company,
    website: d.website,
    location: d.location,
    industry: d.industry,
    size: d.size,
    description: d.description,
    whatsapp: d.whatsapp,
    source: mode,
    sourceLabel: "Simulated demo company",
  };
}

function domainFromUrl(url: string): string | null {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function cleanCompanyName(title: string): string {
  return title.replace(/\s*[-–|]\s*.*$/, "").replace(/^(About|Home|Official website of)\s+/i, "").trim().slice(0, 80);
}

interface FilterVerdict {
  index: number;
  keep: boolean;
  confidence: number;
  reason: string;
}

export async function cheapFilter(mem: Memory, candidates: Candidate[]): Promise<Candidate[]> {
  if (candidates.length === 0) return [];
  const icp = mem.icp;
  const list = candidates
    .map((c, i) => `${i}. ${c.company} | ${c.industry || "-"} | ${c.location || "-"} | ${c.size || "-"} | ${(c.description || "").slice(0, 180)}`)
    .join("\n");

  const verdicts = await chatJSON<FilterVerdict[]>(
    `Below is a list of discovered companies. Use the ICP to decide which companies are WORTH researching further (keep=true) and which are obviously irrelevant (keep=false).

ICP:
- Location: ${icp?.location || "-"}
- Industry: ${icp?.industry || "-"}
- Company size / criteria: ${icp?.companySize || "-"}
- Special target: ${icp?.specialTarget || "-"}
- Keywords: ${icp?.keywords?.join(", ") || "-"}

Return an array of verdicts, one per company, in the same order:
[{"index":0,"keep":true,"confidence":0-100,"reason":"short reason grounded in ICP fit"}]

CANDIDATES:
${list}`,
    "You are a cheap, fast lead filter. Only obvious relevance matters here; when in doubt keep=true so deep research can decide later."
  );

  logActivity(mem, "Discovery", "Cheap filtering", `Filtered ${candidates.length} candidates -> kept ${verdicts.filter((v) => v.keep).length} as potential leads.`);

  const map = new Map(verdicts.map((v) => [v.index, v]));
  return candidates.filter((_, i) => map.get(i)?.keep ?? true);
}

export function createLead(mem: Memory, c: Candidate, stage: Stage, extra?: Partial<Lead>): Lead {
  const lead: Lead = {
    id: uid("lead"),
    company: c.company,
    website: c.website,
    location: c.location,
    industry: c.industry,
    size: c.size,
    description: c.description,
    whatsapp: c.whatsapp,
    source: c.source,
    sourceLabel: c.sourceLabel,
    stage,
    emails: [],
    replies: [],
    followUps: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    simulated: c.source === "demo",
    ...extra,
  };
  mem.leads.push(lead);
  return lead;
}

export function evidenceFromCandidate(c: Candidate): EvidenceItem[] {
  const ev: EvidenceItem[] = [];
  if (c.description) ev.push({ type: "source", detail: c.description, simulated: c.source === "demo", url: c.website });
  if (c.website) ev.push({ type: "website", detail: `Company domain: ${c.website}`, simulated: c.source === "demo", url: c.website });
  if (c.industry) ev.push({ type: "profile", detail: `Industry: ${c.industry}` });
  if (c.location) ev.push({ type: "profile", detail: `Location: ${c.location}` });
  return ev;
}
