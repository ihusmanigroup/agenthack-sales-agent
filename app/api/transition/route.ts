import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { transition } from "@/lib/pipeline";
import { Stage } from "@/lib/types";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.leadId || !body.stage) throw new Error("leadId and stage are required.");
    await withMemory(async (mem) => {
      const lead = requireLead(mem, body.leadId);
      transition(mem, lead, body.stage as Stage, body.note);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Transition failed" }, { status: 400 });
  }
}
