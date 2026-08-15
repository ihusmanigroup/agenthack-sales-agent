import { Memory, Lead, Stage, PIPELINE_STAGES, NEGATIVE_STAGES } from "./types";
import { logActivity } from "./storage";

export function transition(mem: Memory, lead: Lead, stage: Stage, note?: string): Lead {
  const prev = lead.stage;
  lead.stage = stage;
  lead.updatedAt = new Date().toISOString();
  if (note) lead.notes = note;
  logActivity(mem, "Pipeline", `${lead.company}: ${prev} -> ${stage}`, note || "");
  return lead;
}

export function pipelineSummary(mem: Memory) {
  const byStage: Record<string, Lead[]> = {};
  [...PIPELINE_STAGES, ...NEGATIVE_STAGES].forEach((s) => (byStage[s] = []));
  mem.leads.forEach((l) => {
    if (!byStage[l.stage]) byStage[l.stage] = [];
    byStage[l.stage].push(l);
  });
  return {
    total: mem.leads.length,
    byStage,
    qualified: byStage["Qualified"] ?? [],
    qualifiedCount: (byStage["Qualified"] ?? []).length,
    converted: (byStage["Converted"] ?? []).length,
  };
}
