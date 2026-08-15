import { Memory, ICP } from "./types";
import { chatJSON } from "./llm";
import { logActivity } from "./storage";

export interface ICPInput {
  location: string;
  industry: string;
  companySize: string;
  specialTarget: string;
  extraNotes?: string;
}

export async function buildICP(mem: Memory, input: ICPInput): Promise<ICP> {
  const icp = await chatJSON<ICP>(
    `Convert these answers from a sales manager into a structured Ideal Customer Profile (ICP). Add a short "keywords" list (5-12 terms) that best describe the target, useful for lead discovery and filtering.

Input:
- Target location: ${input.location || "not specified"}
- Target industry / market: ${input.industry || "not specified"}
- Company size / criteria: ${input.companySize || "not specified"}
- Special target (problem / use case / service / customer type): ${input.specialTarget || "not specified"}
- Extra notes: ${input.extraNotes || "none"}`,
    "You convert user answers into a structured, unambiguous ICP."
  );

  mem.icp = { ...icp, createdAt: new Date().toISOString(), notes: input.extraNotes };
  logActivity(mem, "ICP", "ICP defined", `Location=${icp.location || "-"} | Industry=${icp.industry || "-"} | Size=${icp.companySize || "-"} | Focus=${icp.specialTarget || "-"}`);
  return mem.icp;
}
