import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { deepResearch } from "@/lib/research";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await withMemory(async (mem) => {
      const lead = requireLead(mem, body.leadId);
      await deepResearch(mem, lead);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Research failed" }, { status: 400 });
  }
}
