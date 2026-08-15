"use client";

import { useState } from "react";
import { Lead, PIPELINE_STAGES, Stage } from "@/lib/types";
import { ClientMemory } from "@/lib/serialize";
import { Btn, Card, StageBadge, ScoreBadge, Empty, Spinner } from "./ui";
import { post } from "@/lib/client";

const POSITIVE_STAGES: Stage[] = [...PIPELINE_STAGES];

interface TabProps {
  state: ClientMemory;
  act: (url: string, body?: unknown) => Promise<any>;
}

export function PipelineTab({ state, act }: TabProps) {
  const [drag, setDrag] = useState<string | null>(null);
  const byStage: Record<string, Lead[]> = {};
  POSITIVE_STAGES.forEach((s) => (byStage[s] = []));
  state.leads.forEach((l: Lead) => {
    if (!byStage[l.stage]) byStage[l.stage] = [];
    byStage[l.stage].push(l);
  });

  const handleDrop = async (leadId: string, newStage: Stage) => {
    await act("/api/transition", { leadId, stage: newStage });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sales Pipeline</h2>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span>Total: <b>{state.leads.length}</b></span>
          <span>Qualified: <b>{byStage["Qualified"]?.length ?? 0}</b></span>
          <span>Converted: <b>{byStage["Converted"]?.length ?? 0}</b></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {POSITIVE_STAGES.map((stage) => {
            const leads = byStage[stage] || [];
            return (
              <div key={stage} className="w-72 flex-shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <StageBadge stage={stage} />
                  <span className="text-xs text-zinc-500">{leads.length}</span>
                </div>
                <div
                  className="rounded-xl border-2 border-dashed border-zinc-800/50 bg-zinc-900/40 min-h-[200px] p-2"
                  onDragOver={(e) => { e.preventDefault(); setDrag(stage); }}
                  onDragLeave={() => setDrag(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDrag(null);
                    const leadId = e.dataTransfer.getData("leadId");
                    if (leadId) handleDrop(leadId, stage);
                  }}
                >
                  {drag === stage && <div className="absolute inset-0 rounded-xl bg-indigo-500/10 border border-indigo-500/30 pointer-events-none" />}
                  {leads.length === 0 ? (
                    <Empty text="Drop leads here" />
                  ) : (
                    <div className="space-y-2">
                      {leads.map((lead) => (
                        <PipelineCard key={lead.id} lead={lead} onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-4">
        <h3 className="mb-3 text-sm font-medium text-zinc-400">Negative Outcomes</h3>
        <div className="flex flex-wrap gap-2">
          {["Not Qualified", "Not Interested", "Do Not Contact"].map((stage) => {
            const leads = state.leads.filter((l: Lead) => l.stage === stage);
            return leads.length ? (
              <div key={stage} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-2">
                <StageBadge stage={stage as Stage} />
                <span className="ml-2 text-xs text-zinc-400">{leads.length} leads</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

function PipelineCard({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent) => void }) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-2.5 cursor-grab hover:border-zinc-600 active:cursor-grabbing transition"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{lead.company}</div>
          <div className="text-[11px] text-zinc-500">{lead.industry || "—"} · {lead.location || "—"}</div>
        </div>
        <ScoreBadge score={lead.score} />
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-zinc-400">
        {lead.matchedService && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.matchedService}</span>}
        {lead.contacts && lead.contacts.length > 0 && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{lead.contacts.length} contacts</span>}
      </div>
    </div>
  );
}