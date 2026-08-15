"use client";

import { useState } from "react";
import { Lead } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Btn, Card, Field, inputCls, StageBadge, ScoreBadge, Label, Empty } from "./ui";
import { post } from "@/lib/client";

interface TabProps {
  state: ClientMemory;
  act: (url: string, body?: unknown) => Promise<any>;
}

export function InboxTab({ state, act }: TabProps) {
  const [reply, setReply] = useState({ leadId: "", from: "", text: "" });
  const [loading, setLoading] = useState(false);

  const leadsWithReplies = state.leads.filter((l: Lead) => l.replies.length > 0);
  const contactedLeads = state.leads.filter((l: Lead) => ["Contacted", "Interested"].includes(l.stage));
  const dueFollowUps = contactedLeads.filter((l: Lead) =>
    l.followUps.some((f) => f.status === "scheduled" && new Date(f.scheduledAt) <= new Date())
  );

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.leadId || !reply.from || !reply.text.trim()) return;
    setLoading(true);
    await act("/api/reply", reply);
    setReply({ leadId: "", from: "", text: "" });
    setLoading(false);
  };

  const runFollowUps = async () => {
    setLoading(true);
    await act("/api/followup", { run: true });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Inbound Replies</h2>
        <Card className="p-4 space-y-4">
          <form onSubmit={handleReply} className="space-y-3">
            <Field label="Reply to lead">
              <select
                value={reply.leadId}
                onChange={(e) => setReply({ ...reply, leadId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select lead…</option>
                {leadsWithReplies.map((l: Lead) => <option key={l.id} value={l.id}>{l.company}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="From (email)">
                <input value={reply.from} onChange={(e) => setReply({ ...reply, from: e.target.value })} className={inputCls} placeholder="prospect@company.com" />
              </Field>
              <Field label="Classification (auto-filled)">
                <input value="" className={inputCls} placeholder="Auto-classified on submit" disabled />
              </Field>
            </div>
            <Field label="Reply text">
              <textarea value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} className={inputCls} rows={4} />
            </Field>
            <Btn type="submit" loading={loading}>Classify & Auto-Respond</Btn>
          </form>

          {leadsWithReplies.length === 0 && <Empty text="No replies yet. Send outreach emails first." />}

          <div className="space-y-3">
            {leadsWithReplies.map((lead: Lead) =>
              lead.replies.slice().reverse().map((r) => (
                <div key={r.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <b className="text-zinc-100">{lead.company}</b>
                      <span className="ml-2 text-zinc-400">{r.from}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">{new Date(r.receivedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-zinc-300">{r.text}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    <StageBadge stage={r.classification as any} />
                    <Label>{r.nextAction}</Label>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Follow-up Queue</h2>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Leads awaiting follow-up</h4>
            <Btn variant="secondary" onClick={runFollowUps} loading={loading}>Run Due Follow-ups Now</Btn>
          </div>
          {dueFollowUps.length === 0 ? (
            <Empty text="No follow-ups due. Schedule follow-ups after outreach." />
          ) : (
            <div className="space-y-2">
              {dueFollowUps.map((lead: Lead) => {
                const due = lead.followUps.find((f) => f.status === "scheduled");
                return (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                    <div>
                      <b>{lead.company}</b>
                      <span className="ml-2 text-zinc-400">Follow-up due: {due ? new Date(due.scheduledAt).toLocaleString() : "—"}</span>
                    </div>
                    <Btn size="sm" onClick={() => act("/api/followup", { leadId: lead.id })}>Send Now</Btn>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">All Outreach Emails</h2>
        <Card className="p-4">
          <div className="space-y-2 max-h-96 overflow-auto">
            {state.leads
              .flatMap((l: Lead) => l.emails.map((e) => ({ ...e, company: l.company })))
              .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
              .map((e) => (
                <div key={e.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <b>{e.company}</b>
                      <StageBadge stage={e.followUp ? "Follow-up" : "Initial"} />
                      <span className="text-zinc-400">{e.toName}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">{new Date(e.sentAt).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-zinc-400 line-clamp-1">{e.subject}</div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{e.channel}</span>
                    {e.simulated && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">Simulated</span>}
                    {e.followUp && <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">Follow-up</span>}
                    {e.meetingLink && <a href={e.meetingLink} target="_blank" className="text-sky-400 hover:underline">Meeting</a>}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      </section>
    </div>
  );
}