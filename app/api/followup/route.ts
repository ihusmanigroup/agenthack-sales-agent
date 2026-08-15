import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory, logActivity } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { scheduleFollowUp, runDueFollowUps } from "@/lib/followup";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.run) {
      const report = await withMemory(async (mem) => {
        return await runDueFollowUps(mem);
      });
      const mem = await readMemory();
      return NextResponse.json({ ok: true, run: true, report, state: serializeMemory(mem) });
    }

    if (!body?.leadId) throw new Error("Provide leadId or run:true");
    await withMemory(async (mem) => {
      const lead = requireLead(mem, body.leadId);
      scheduleFollowUp(mem, lead, body.days ?? 3);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Follow-up failed" }, { status: 400 });
  }
}
