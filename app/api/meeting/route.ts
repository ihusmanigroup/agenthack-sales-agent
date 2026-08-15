import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { finalizeMeeting } from "@/lib/meeting";
import { sendMeetingConfirmationEmail } from "@/lib/outreach";
import { requireLead } from "@/app/api/helpers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, time } = body;
    if (!time) throw new Error("Provide a meeting time (ISO string).");

    await withMemory(async (mem) => {
      const lead = requireLead(mem, leadId);
      const meeting = await finalizeMeeting(mem, lead, time, { requestedTime: body.requestedTime });
      const contact = lead.contacts?.find((c) => c.email === body.from) || lead.contacts?.[0];
      if (contact) await sendMeetingConfirmationEmail(mem, lead, contact);
      return meeting;
    });

    const mem = await readMemory();
    return NextResponse.json({ ok: true, state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Meeting scheduling failed" }, { status: 400 });
  }
}
