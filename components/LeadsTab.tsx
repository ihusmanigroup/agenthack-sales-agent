"use client";

import { useState } from "react";
import { Lead, Stage, EvidenceItem } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Btn, Card, StageBadge, ScoreBadge, Empty, Spinner } from "./ui";
import { post } from "@/lib/client";

interface TabProps {
  state: ClientMemory;
  act: (url: string, body?: unknown) => Promise<any>;
}

export function LeadsTab({ state, act }: TabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lead = selectedId ? state.leads.find((l: Lead) => l.id === selectedId) : null;

  return (
    <div className="flex gap-6">
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-auto space-y-2">
          {state.leads.length === 0 ? (
            <Empty text="No leads yet. Run Discovery first." />
          ) : (
            state.leads.map((l: Lead) => (
              <LeadListItem key={l.id} lead={l} selected={l.id === selectedId} onClick={() => setSelectedId(l.id)} />
            ))
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {lead ? <LeadDetail lead={lead} act={act} /> : <Empty text="Select a lead to see details and take actions." />}
      </div>
    </div>
  );
}

function LeadListItem({ lead, selected, onClick }: { lead: Lead; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-3 text-sm transition ${selected ? "border-indigo-500 bg-indigo-500/10" : "border-zinc-800 hover:border-zinc-700"}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium truncate">{lead.company}</span>
        <StageBadge stage={lead.stage} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
        {lead.industry && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.industry}</span>}
        {lead.location && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.location}</span>}
        {lead.simulated && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">Demo</span>}
      </div>
      {lead.score !== undefined && <div className="mt-1"><ScoreBadge score={lead.score} /></div>}
    </button>
  );
}

function LeadDetail({ lead, act }: { lead: Lead; act: (url: string, body?: unknown) => Promise<any> }) {
  const [loading, setLoading] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>, label: string) => {
    setLoading(label);
    try { await fn(); } finally { setLoading(null); }
  };

  return (
    <Card className="p-4 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{lead.company}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
            <StageBadge stage={lead.stage} />
            {lead.industry && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.industry}</span>}
            {lead.location && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.location}</span>}
            {lead.size && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.size}</span>}
            {lead.simulated && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">Demo</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScoreBadge score={lead.score} />
        </div>
      </header>

      <section className="space-y-3">
        <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Description & Source</h4>
        <p className="text-sm text-zinc-300">{lead.description || "—"}</p>
        <p className="text-xs text-zinc-500">Source: {lead.sourceLabel || lead.source}</p>
      </section>

      {lead.research && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Deep Research</h4>
          <p className="text-sm text-zinc-300">{lead.research.summary}</p>
          <div className="flex flex-wrap gap-2">
            {lead.research.signals.map((s, i) => <span key={i} className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">{s}</span>)}
          </div>
          <details className="text-xs text-zinc-400">
            <summary className="cursor-pointer">Evidence ({lead.research.evidence?.length ?? 0})</summary>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              {lead.research.evidence?.map((e: EvidenceItem, i: number) => (
                <li key={i}>[<b>{e.type}</b>] {e.detail} {e.url && <a href={e.url} target="_blank" className="ml-1 text-sky-400 hover:underline">link</a>}</li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {lead.matchedService && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Qualification</h4>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">Matched: {lead.matchedService}</span>
          </div>
          <p className="text-sm text-zinc-400">{lead.matchedServiceReason}</p>
          <p className="text-sm text-zinc-400"><b>Score:</b> {lead.score}/100 — {lead.scoreReason}</p>
        </section>
      )}

      {lead.contacts && lead.contacts.length > 0 && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Decision-Makers</h4>
          <div className="space-y-2">
            {lead.contacts.map((c, i) => (
              <div key={i} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <b>{c.name}</b> <span className="text-zinc-500">—</span> <span className="text-zinc-400">{c.role}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{c.relevance}</p>
                {c.email && <p className="text-xs text-sky-400">{c.email}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3 border-t border-zinc-800 pt-4">
        <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Actions</h4>
        <div className="flex flex-wrap gap-2">
          {lead.stage === "Potential" && (
            <Btn onClick={() => run(() => act("/api/research", { leadId: lead.id }), "research")} loading={loading === "research"}>
              Run Deep Research
            </Btn>
          )}
          {(lead.stage === "Potential" || lead.stage === "Researching") && (
            <Btn onClick={() => run(() => act("/api/qualify", { leadId: lead.id }), "qualify")} loading={loading === "qualify"}>
              Qualify & Match Service
            </Btn>
          )}
          {lead.stage === "Qualified" && (
            <Btn onClick={() => run(() => act("/api/outreach", { leadId: lead.id }), "outreach")} loading={loading === "outreach"}>
              Send Outreach Emails
            </Btn>
          )}
          {["Contacted", "Interested"].includes(lead.stage) && (
            <Btn variant="secondary" onClick={() => run(() => act("/api/followup", { leadId: lead.id }), "scheduleFu")} loading={loading === "scheduleFu"}>
              Schedule Follow-up (3d)
            </Btn>
          )}
          {lead.stage === "Interested" && lead.meeting?.time && (
            <Btn variant="secondary" onClick={() => run(() => act("/api/meeting", { leadId: lead.id, time: lead.meeting!.time }), "meeting")} loading={loading === "meeting"}>
              Finalize Meeting
            </Btn>
          )}
          {lead.stage === "Meeting Scheduled" && lead.meeting?.link && (
            <a href={lead.meeting.link} target="_blank" style={{textDecoration:"none"}}><Btn variant="ghost">Open Meeting Link</Btn></a>
          )}
        </div>
      </section>

      {lead.emails.length > 0 && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Email History</h4>
          <div className="space-y-2 max-h-64 overflow-auto">
            {lead.emails.slice().reverse().map((e) => (
              <div key={e.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{e.subject}</span>
                  <span className="text-[11px] text-zinc-500">{new Date(e.sentAt).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-zinc-400 line-clamp-2">{e.body}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{e.channel}</span>
                  {e.simulated && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">Simulated</span>}
                  {e.followUp && <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[11px] font-medium text-sky-300 border border-sky-500/30">Follow-up</span>}
                  {e.meetingLink && <a href={e.meetingLink} target="_blank" className="text-sky-400 hover:underline">Meeting link</a>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {lead.replies.length > 0 && (
        <section className="space-y-3 border-t border-zinc-800 pt-4">
          <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500">Replies</h4>
          <div className="space-y-2">
            {lead.replies.slice().reverse().map((r) => (
              <div key={r.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <b>{r.from}</b>
                  <span className="text-[11px] text-zinc-500">{new Date(r.receivedAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-zinc-300">{r.text}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px]">
                  <StageBadge stage={r.classification as Stage} />
                  <span className="text-zinc-400">{r.nextAction}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </Card>
  );
}