"use client";

import { Lead } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Card, StageBadge, ScoreBadge, Empty } from "./ui";

interface TabProps {
  state: ClientMemory;
}

export function MemoryTab({ state }: TabProps) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Company Knowledge (RAG)</h2>
        <Card className="p-4 space-y-4">
          {state.company ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <b className="text-lg">{state.company.name}</b>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">Services: {state.company.services.length}</span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">Industries: {state.company.targetIndustries.length}</span>
              </div>
              <p className="text-sm text-zinc-300">{state.company.summary}</p>

              <details className="border-t border-zinc-800 pt-3">
                <summary className="cursor-pointer font-medium">Services</summary>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                  {state.company.services.map((s) => (
                    <li key={s.name}><b>{s.name}:</b> {s.description}</li>
                  ))}
                </ul>
              </details>

              <details className="border-t border-zinc-800 pt-3">
                <summary className="cursor-pointer font-medium">Case Studies</summary>
                <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
                  {state.company.caseStudies.map((c, i) => (
                    <li key={i}><b>{c.title}:</b> {c.summary}</li>
                  ))}
                </ul>
              </details>

              <details className="border-t border-zinc-800 pt-3">
                <summary className="cursor-pointer font-medium">Pricing / Packages</summary>
                <p className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">{state.company.pricing}</p>
              </details>

              <details className="border-t border-zinc-800 pt-3">
                <summary className="cursor-pointer font-medium">Tech & Integrations</summary>
                <div className="mt-2 flex flex-wrap gap-1">
                  {state.company.technologies.map((t) => <span key={t} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{t}</span>)}
                  {state.company.integrations.map((i) => <span key={i} className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-medium text-violet-300 border border-violet-500/30">{i}</span>)}
                </div>
              </details>
            </div>
          ) : (
            <Empty text="No company ingested yet. Go to Setup tab." />
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">RAG Index</h2>
        <Card className="p-4 space-y-2">
          {state.rag?.hasIndex ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">Chunks indexed: {state.rag.chunkCount}</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">Ready</span>
              </div>
              <p className="text-zinc-500">Vector embeddings stored in memory. Search works via cosine similarity.</p>
            </div>
          ) : (
            <Empty text="No RAG index built yet. Ingest company text first." />
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">ICP (Ideal Customer Profile)</h2>
        <Card className="p-4 space-y-2">
          {state.icp ? (
            <div className="space-y-2 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div><b>Location:</b> {state.icp.location || "—"}</div>
                <div><b>Industry:</b> {state.icp.industry || "—"}</div>
                <div><b>Company size:</b> {state.icp.companySize || "—"}</div>
                <div><b>Special target:</b> {state.icp.specialTarget || "—"}</div>
              </div>
              <div><b>Keywords:</b> <span className="ml-2">{state.icp.keywords?.join(", ") || "—"}</span></div>
              {state.icp.notes && <div><b>Notes:</b> {state.icp.notes}</div>}
            </div>
          ) : (
            <Empty text="ICP not defined yet. Go to Setup tab." />
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Short-Term Memory</h2>
        <Card className="p-4">
          {state.shortTerm.length > 0 ? (
            <div className="space-y-1 text-sm max-h-48 overflow-auto">
              {state.shortTerm.map((s) => (
                <div key={s.key} className="flex gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{s.key}</span>
                  <span className="text-zinc-400">{s.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No short-term entries." />
          )}
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Long-Term Memory (Leads History)</h2>
        <Card className="p-4">
          <div className="space-y-2 max-h-64 overflow-auto">
            {state.leads.length > 0 ? (
              state.leads.map((l: Lead) => (
                <div key={l.id} className="rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <b>{l.company}</b>
                    <span className="text-[11px]">{l.stage}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 text-[11px]">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{l.stage}</span>
                    {l.score !== undefined && <ScoreBadge score={l.score} />}
                    {l.matchedService && <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30">{l.matchedService}</span>}
                    {l.simulated && <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30">Demo</span>}
                  </div>
                  <div className="mt-1 flex gap-2 text-[11px] text-zinc-500">
                    <span>Emails: {l.emails.length}</span>
                    <span>Replies: {l.replies.length}</span>
                    <span>Follow-ups: {l.followUps.length}</span>
                    {l.meeting && <span className="text-sky-400">Meeting: {new Date(l.meeting.time).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))
            ) : (
              <Empty text="No leads in memory." />
            )}
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Agent Activity Log</h2>
        <Card className="p-4">
          <div className="space-y-2 max-h-64 overflow-auto font-mono text-xs">
            {state.activities.slice(0, 80).map((a, i) => (
              <div key={i} className="flex gap-2 py-1 border-b border-zinc-800/50">
                <span className="text-zinc-500 w-20 shrink-0">{new Date(a.at).toLocaleTimeString()}</span>
                <span className="text-zinc-400 w-24 shrink-0">[{a.agent}]</span>
                <span className="text-zinc-300 font-medium">{a.action}</span>
                <span className="text-zinc-500 flex-1 truncate">{a.detail}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}