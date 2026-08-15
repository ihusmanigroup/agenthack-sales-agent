import { Memory } from "./types";

export interface ClientMemory extends Omit<Memory, "rag" | "rawCompanyText"> {
  rag?: { hasIndex: boolean; chunkCount: number };
  rawCompanyText?: string;
}

export function serializeMemory(mem: Memory): ClientMemory {
  return {
    company: mem.company,
    rawCompanyText: mem.rawCompanyText ? mem.rawCompanyText.slice(0, 2000) : "",
    icp: mem.icp,
    leads: mem.leads,
    shortTerm: mem.shortTerm,
    currentTask: mem.currentTask,
    activities: mem.activities,
    rag: mem.rag ? { hasIndex: true, chunkCount: mem.rag.chunks.length } : { hasIndex: false, chunkCount: 0 },
  };
}
