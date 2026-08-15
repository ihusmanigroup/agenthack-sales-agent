import { Memory, Lead } from "@/lib/types";

export function requireLead(mem: Memory, leadId: string): Lead {
  const lead = mem.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);
  return lead;
}
