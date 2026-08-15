import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory, logActivity } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { discoverCandidates, cheapFilter, createLead, evidenceFromCandidate } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: "demo" | "vendor" | "search" = body.mode || "demo";
    const vendorText: string = body.vendorText || "";

    const result = await withMemory(async (mem) => {
      if (!mem.icp) throw new Error("Define the ICP first (Setup tab).");
      const candidates = await discoverCandidates(mem, mode, vendorText);
      if (candidates.length === 0) throw new Error("No candidates discovered.");
      const kept = await cheapFilter(mem, candidates);
      const keptIds = new Set(kept.map((c) => c.company.toLowerCase()));
      const leads = candidates.map((c) => {
        const isKept = keptIds.has(c.company.toLowerCase());
        return createLead(mem, c, isKept ? "Potential" : "Discovered", {
          notes: isKept ? undefined : "Filtered out by cheap filtering (low ICP relevance).",
          research: { summary: "", profile: {}, signals: [], evidence: evidenceFromCandidate(c) },
        });
      });
      logActivity(mem, "Discovery", `Discovery complete (${mode})`, `${leads.length} leads created, ${kept.length} passed cheap filtering.`);
      return { total: leads.length, kept: kept.length, leads };
    });

    const mem = await readMemory();
    return NextResponse.json({ ok: true, ...result, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Discovery failed" }, { status: 400 });
  }
}
