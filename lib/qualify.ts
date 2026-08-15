import { Memory, Lead, Contact } from "./types";
import { chatJSON } from "./llm";
import { ragContext } from "./rag";
import { logActivity } from "./storage";

export interface QualificationResult {
  qualified: boolean;
  score: number;
  scoreReason: string;
  matchedService: { name: string; description: string; reason: string };
  contacts: Contact[];
  painPoints: string[];
  recommendedTalkTrack: string;
}

export async function qualifyLead(mem: Memory, lead: Lead): Promise<QualificationResult> {
  if (!mem.company) throw new Error("Company knowledge must be ingested before qualification.");
  if (!mem.icp) throw new Error("ICP must be defined before qualification.");

  const research = lead.research;
  const context = await ragContext(mem, "services, packages, integrations, case studies, selling points", 8);

  const servicesList = mem.company.services.map((s) => `- ${s.name}: ${s.description}`).join("\n");
  const signals = research?.signals?.join("; ") || lead.description?.slice(0, 400) || "no signals collected";
  const evidence = research?.evidence?.map((e) => `[${e.type}] ${e.detail}`).join("\n") || "no evidence";

  const result = await chatJSON<QualificationResult>(
    `You are the qualification engine of an autonomous sales agent. Decide whether "${lead.company}" is a strong lead and how to sell to them.

COMPANY KNOWLEDGE (RAG-grounded — only recommend services from this list):
${servicesList}

RAG CONTEXT (extra grounding from the company's knowledge base):
${context.slice(0, 4000)}

ICP:
- Location: ${mem.icp.location || "-"}
- Industry: ${mem.icp.industry || "-"}
- Size: ${mem.icp.companySize || "-"}
- Special target: ${mem.icp.specialTarget || "-"}

PROSPECT:
- Name: ${lead.company}
- Industry: ${lead.industry || "?"} | Location: ${lead.location || "?"} | Size: ${lead.size || "?"}
- Signals / description: ${signals}

EVIDENCE:
${evidence.slice(0, 3500)}

Return JSON:
{
  "qualified": boolean,
  "score": 0-100,
  "scoreReason": "clear justification referencing ICP fit, problem fit, service fit, buying signals, evidence quality",
  "matchedService": { "name": "exact service from company list", "description": "...", "reason": "why this exact service is the best fit, grounded in prospect evidence" },
  "contacts": [ { "name": "...", "role": "role", "email": "optional", "linkedin": "optional", "relevance": "why this person" } ],
  "painPoints": ["...", "..."],
  "recommendedTalkTrack": "the one-paragraph pitch angle grounded in the prospect's situation"
}

RULES:
- Only pick matchedService.name from the company services list above.
- Score should reflect how well the prospect matches the ICP AND has a real problem the company can solve. Be honest — many companies should be not qualified.
- Decision-makers: prioritize the roles most relevant to the matched service (e.g. CTO for technical fit, CEO/COO for operations, Head of Sales for revenue, Head of Support for support volume).
- Names/emails: The prospect is ${lead.simulated ? "SIMULATED (fictional)" : "REAL"}. ${lead.simulated ? "You may create plausible fictional names/emails clearly appropriate for a fictional company." : "If no actual person's name/email is in the evidence, use name \"<Role> (name not in evidence)\" and DO NOT invent emails."}
- Do not invent facts about the prospect. Ground everything in the evidence provided.`,
    "You are a cautious sales qualification engine. You never invent facts about prospects, and you only recommend services the company actually sells."
  );

  lead.score = result.score;
  lead.scoreReason = result.scoreReason;
  lead.matchedService = result.matchedService.name;
  lead.matchedServiceReason = result.matchedService.reason;
  lead.contacts = result.contacts;
  lead.qualifiedAt = new Date().toISOString();
  lead.stage = result.qualified ? "Qualified" : "Not Qualified";
  lead.updatedAt = new Date().toISOString();

  logActivity(
    mem,
    "Qualify",
    `${lead.company}: ${result.qualified ? "QUALIFIED" : "NOT QUALIFIED"}`,
    `Score ${result.score}/100. Service: ${result.matchedService.name}. ${result.scoreReason}`
  );

  return result;
}
