"use client";

import { useState } from "react";
import { Lead } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Btn, Card, StageBadge, ScoreBadge, Empty } from "./ui";
import { post } from "@/lib/client";

interface TabProps {
  state: ClientMemory;
  act: (url: string, body?: unknown) => Promise<any>;
}

export function MeetingsTab({ state, act }: TabProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const meetings = state.leads
    .filter((l: Lead) => l.meeting)
    .map((l: Lead) => ({ ...l, meeting: l.meeting! }));

  const upcoming = meetings
    .filter((m) => new Date(m.meeting.time) > new Date())
    .sort((a, b) => new Date(a.meeting.time).getTime() - new Date(b.meeting.time).getTime());

  const past = meetings
    .filter((m) => new Date(m.meeting.time) <= new Date())
    .sort((a, b) => new Date(b.meeting.time).getTime() - new Date(a.meeting.time).getTime());

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Upcoming Meetings</h2>
        <Card className="p-4 space-y-3">
          {upcoming.length === 0 ? (
            <Empty text="No meetings scheduled yet. Qualify leads and send outreach." />
          ) : (
            <div className="space-y-2">
              {upcoming.map((m) => (
                <MeetingCard key={m.id} meeting={m} act={act} loading={loading} setLoading={setLoading} />
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Past Meetings</h2>
        <Card className="p-4">
          {past.length === 0 ? (
            <Empty text="No past meetings." />
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {past.map((m) => (
                <div key={m.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <b>{m.company}</b>
                      <StageBadge stage={m.stage} />
                    </div>
                    <span className="text-[11px] text-zinc-500">{new Date(m.meeting.time).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <a href={m.meeting.link} target="_blank" className="text-sky-400 hover:underline">Recording/Link</a>
                    {m.meeting.briefing && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">Briefed</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Admin Reminders (30 min before)</h2>
        <Card className="p-4 space-y-3">
          <Btn variant="secondary" onClick={async () => { setLoading("reminders"); await act("/api/reminders"); setLoading(null); }} loading={loading === "reminders"}>
            Run Reminder Check Now
          </Btn>
          <p className="text-xs text-zinc-500">Triggers WhatsApp reminders to admin 30 minutes before each meeting. (Requires ADMIN_WHATSAPP + Twilio creds for real delivery.)</p>
          <div className="border-t border-zinc-800 pt-3 space-y-2">
            {upcoming
              .filter((m) => m.meeting.reminderAt)
              .map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.company} — {new Date(m.meeting.time).toLocaleString()}</span>
                  <span className="text-[11px]">{m.meeting.reminderSent ? "✓ Sent" : "⏳ Pending"}</span>
                </div>
              ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function MeetingCard({
  meeting,
  act,
  loading,
  setLoading,
}: {
  meeting: Lead & { meeting: NonNullable<Lead["meeting"]> };
  act: (url: string, body?: unknown) => Promise<any>;
  loading: string | null;
  setLoading: (s: string | null) => void;
}) {
  const mtg = meeting.meeting;
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <b className="text-lg">{meeting.company}</b>
          <span className="ml-2">{new Date(mtg.time).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <StageBadge stage={meeting.stage} />
          <a href={mtg.link} target="_blank" className="text-sky-400 hover:underline text-sm">Open Link</a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {meeting.matchedService && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">Service: {meeting.matchedService}</span>}
        {meeting.score !== undefined && <ScoreBadge score={meeting.score} />}
      </div>

      {mtg.briefing && (
        <details className="text-sm text-zinc-300">
          <summary className="cursor-pointer font-medium text-zinc-100">Meeting Briefing</summary>
          <pre className="mt-2 whitespace-pre-wrap text-zinc-400">{mtg.briefing}</pre>
        </details>
      )}

      {mtg.adminNotifiedAt && (
        <div className="text-xs text-emerald-400">Admin notified on WhatsApp at {new Date(mtg.adminNotifiedAt).toLocaleString()}</div>
      )}

      {!mtg.reminderSent && mtg.reminderAt && (
        <div className="text-xs text-amber-400">Reminder scheduled for {new Date(mtg.reminderAt).toLocaleString()}</div>
      )}
    </div>
  );
}