import { NextRequest, NextResponse } from "next/server";
import { withMemory, readMemory } from "@/lib/storage";
import { serializeMemory } from "@/lib/serialize";
import { runMeetingReminders } from "@/lib/meeting";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const reminders = await withMemory(async (mem) => await runMeetingReminders(mem));
    const mem = await readMemory();
    return NextResponse.json({ ok: true, reminders: reminders.map((r) => r.lead.company), state: serializeMemory(mem) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Reminders failed" }, { status: 400 });
  }
}
