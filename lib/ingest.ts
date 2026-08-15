import { Memory, CompanyKnowledge } from "./types";
import { chatJSON } from "./llm";
import { buildIndex } from "./rag";
import { logActivity, setShortTerm } from "./storage";

export async function ingestCompanyText(mem: Memory, text: string): Promise<CompanyKnowledge> {
  if (!text || text.trim().length < 40) {
    throw new Error("Company text is too short. Provide the full company description or PDF.");
  }

  await buildIndex(mem, text);
  mem.rawCompanyText = text;

  const knowledge = await chatJSON<CompanyKnowledge>(
    `Extract a structured, ACCURATE company profile from the source text below.

Rules:
- Only include facts present in the text. Do NOT invent services, prices, or case studies.
- If something is unknown or absent, use an empty array or "".
- "services" should be a clean list of { name, description } of everything the company sells / does.
- "sellingPoints" are the strongest reasons a customer would buy from this company, grounded in the text.

SOURCE TEXT:
"""${text}"""`,
    "You extract precise company knowledge from source material. Never fabricate facts."
  );

  mem.company = knowledge;
  setShortTerm(mem, "company", knowledge.name);
  logActivity(mem, "RAG-ingest", "Company knowledge stored", `Ingested "${knowledge.name}" (${knowledge.services.length} services, ${mem.rag?.chunks.length ?? 0} chunks embedded).`);

  return knowledge;
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = require("pdf-parse");
  const data = await pdf(buffer);
  return String(data.text || "");
}
