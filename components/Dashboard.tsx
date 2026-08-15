"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientMemory } from "@/lib/serialize";
import { fetchState, cacheState, post } from "@/lib/client";
import { SetupTab } from "./SetupTab";
import { PipelineTab } from "./PipelineTab";
import { LeadsTab } from "./LeadsTab";
import { InboxTab } from "./InboxTab";
import { MeetingsTab } from "./MeetingsTab";
import { MemoryTab } from "./MemoryTab";
import { Spinner } from "./ui";

type Tab = "setup" | "pipeline" | "leads" | "inbox" | "meetings" | "memory";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "setup", label: "Setup", icon: "⚙️" },
  { id: "pipeline", label: "Pipeline", icon: "📊" },
  { id: "leads", label: "Leads", icon: "🎯" },
  { id: "inbox", label: "Inbox & Follow-ups", icon: "✉️" },
  { id: "meetings", label: "Meetings", icon: "📅" },
  { id: "memory", label: "Memory", icon: "🧠" },
];

export default function Dashboard() {
  const [state, setState] = useState<ClientMemory | null>(null);
  const [tab, setTab] = useState<Tab>("setup");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const s = await fetchState();
      setState(s);
      cacheState(s);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load state");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const act = useCallback(
    async (url: string, body?: unknown) => {
      setError(null);
      const res = await post<ClientMemory>(url, body);
      if (!res.ok) {
        setError(res.error || "Request failed");
        throw new Error(res.error || "Request failed");
      }
      if (res.state) {
        setState(res.state);
        cacheState(res.state);
      }
      return res;
    },
    []
  );

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 text-zinc-400">
        <Spinner className="h-6 w-6" /> Loading agent state…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-lg">🤖</div>
            <div>
              <h1 className="text-base font-bold leading-tight">Autonomous AI Sales Agent</h1>
              <p className="text-xs text-zinc-400">RAG → ICP → Discovery → Research → Qualification → Outreach → Follow-up</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill state={state} />
            <button onClick={refresh} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800">
              Refresh
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-indigo-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              <span className="mr-1">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="flex items-center justify-between rounded-lg border border-rose-800 bg-rose-950/60 px-4 py-2.5 text-sm text-rose-200">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-bold text-rose-300 hover:text-white">✕</button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === "setup" && <SetupTab state={state} act={act} refresh={refresh} />}
        {tab === "pipeline" && <PipelineTab state={state} act={act} />}
        {tab === "leads" && <LeadsTab state={state} act={act} />}
        {tab === "inbox" && <InboxTab state={state} act={act} />}
        {tab === "meetings" && <MeetingsTab state={state} act={act} />}
        {tab === "memory" && <MemoryTab state={state} />}
      </main>
    </div>
  );
}

function StatusPill({ state }: { state: ClientMemory }) {
  const steps = [
    state.company ? "Company ✓" : "Company",
    state.rag?.hasIndex ? "RAG ✓" : "RAG",
    state.icp ? "ICP ✓" : "ICP",
  ];
  return (
    <div className="hidden items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1 text-[11px] md:flex">
      {steps.map((s, i) => (
        <span key={i} className={s.endsWith("✓") ? "text-emerald-400" : "text-zinc-500"}>
          {i > 0 && <span className="mx-1 text-zinc-700">→</span>}
          {s}
        </span>
      ))}
    </div>
  );
}
