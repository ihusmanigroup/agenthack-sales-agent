import { Memory, Lead, ResearchProfile, EvidenceItem } from "./types";
import { chatJSON } from "./llm";
import { logActivity, uid } from "./storage";
import { webSearch, hasWebSearch } from "./search";

export async function deepResearch(mem: Memory, lead: Lead): Promise<ResearchProfile> {
  lead.stage = "Researching";
  lead.updatedAt = new Date().toISOString();
  logActivity(mem, "Research", `Deep research: ${lead.company}`, "Collecting profile, signals and evidence.");

  const evidence: EvidenceItem[] = lead.research?.evidence ?? [];
  if (lead.description) {
    evidence.unshift({ type: "source", detail: lead.description, simulated: lead.simulated, url: lead.website });
  }

  let webEvidence = "";
  if (hasWebSearch()) {
    const qs = [
      `${lead.company} company profile funding news`,
      `${lead.company} ${lead.industry || ""} technology careers`.trim(),
    ];
    for (const q of qs) {
      try {
        const results = await webSearch(q, 5);
        const mapped = results
          .filter((r) => !r.url.toLowerCase().includes("linkedin.com/company/") || r.title.toLowerCase().includes(lead.company.toLowerCase()))
          .slice(0, 4);
        for (const r of mapped) {
          evidence.push({ type: "web", detail: `${r.title}: ${r.snippet}`, url: r.url, simulated: false });
        }
        webEvidence += mapped.map((r) => `- ${r.title}\n  ${r.snippet}\n  ${r.url}`).join("\n") + "\n";
      } catch (e) {
        console.error("research search failed", e);
      }
    }
  }

  const baseText = [
    `Company: ${lead.company}`,
    `Industry: ${lead.industry || "unknown"}`,
    `Location: ${lead.location || "unknown"}`,
    `Size: ${lead.size || "unknown"}`,
    lead.description ? `Known description: ${lead.description}` : "",
    webEvidence ? `Web evidence:\n${webEvidence}` : "(No live web evidence available. Base analysis only on known description.)",
  ].join("\n");

  const profile = await chatJSON<ResearchProfile>(
    `Act as a sales research analyst. Analyse the prospect company below and produce a structured research profile.

Include:
- summary: 2-4 sentences business overview.
- profile: website, employees, funding (if known), news[] (recent developments), technologies[] (tools/stack if inferable).
- signals[]: 3-8 possible business problems / buying signals (e.g. high customer-support volume, manual processes, scaling, hiring) — only ones reasonably supported by evidence.
- evidence[]: an array of { type, detail, url? } listing every piece of evidence you used. Do not fabricate URLs. Mark clearly when a detail is inferred or not verified.

STRICTLY: never invent facts about this company. If funding/employees/technologies are unknown, say so ("Unknown"). Distinguish evidence from inference.

PROSPECT DATA:
${baseText}`,
    "You are a cautious sales research analyst. You report only evidence-based findings and clearly mark inference."
  );

  if (profile.evidence && profile.evidence.length > 0) {
    const merged = new Map<string, EvidenceItem>();
    [...evidence, ...profile.evidence].forEach((e) => merged.set(e.type + "|" + e.detail, e));
    profile.evidence = [...merged.values()];
  }

  lead.research = profile;
  lead.updatedAt = new Date().toISOString();
  logActivity(mem, "Research", `Research complete: ${lead.company}`, `${profile.evidence?.length ?? 0} evidence items, ${profile.signals?.length ?? 0} signals identified.`);

  return profile;
}
