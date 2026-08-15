import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { qualifyLead } from "@/lib/qualify";
import { deepResearch } from "@/lib/research";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let result;
    await withMemory(async (mem) => {
      const lead = requireLead(mem, body.leadId);
      if (!lead.research || (lead.research.signals?.length ?? 0) === 0) {
        await deepResearch(mem, lead);
      }
      result = await qualifyLead(mem, lead);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, result, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Qualification failed" }, { status: 400 });
  }
}
