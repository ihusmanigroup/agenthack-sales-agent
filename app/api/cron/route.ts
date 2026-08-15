import { NextResponse } from "next/server";
import { withMemory } from "@/lib/storage";
import { runDueFollowUps } from "@/lib/followup";
import { runMeetingReminders } from "@/lib/meeting";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const report = await withMemory(async (mem) => {
      const followUps = await runDueFollowUps(mem);
      const reminders = await runMeetingReminders(mem);
      return { followUps, reminders: reminders.map((r) => r.lead.company) };
    });
    return NextResponse.json({ ok: true, report });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
