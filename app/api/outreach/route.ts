import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { sendOutreach } from "@/lib/outreach";
import { scheduleFollowUp } from "@/lib/followup";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await withMemory(async (mem) => {
      const lead = requireLead(mem, body.leadId);
      if (!lead.contacts || lead.contacts.length === 0) throw new Error("Qualify the lead first to identify decision-makers.");
      await sendOutreach(mem, lead, body.contactIndex);
      scheduleFollowUp(mem, lead, 3);
    });
    const mem = await readMemory();
    return NextResponse.json({ ok: true, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Outreach failed" }, { status: 400 });
  }
}
