import React, { ReactNode } from "react";
import { Stage } from "@/lib/types";

export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  className = "",
  loading,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  loading?: boolean;
  type?: "button" | "submit" | "reset";
}) {
  const styles = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    ghost: "bg-transparent hover:bg-zinc-800 text-zinc-300 border border-zinc-700",
  }[variant];
  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${sizeStyles} ${className}`}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 ${className}`}>{children}</div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-indigo-500";

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const STAGE_COLORS: Record<string, string> = {
  Discovered: "bg-zinc-700/40 text-zinc-300 border-zinc-600/50",
  Potential: "bg-sky-500/15 text-sky-300 border-sky-500/40",
  Researching: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  Qualified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  Contacted: "bg-violet-500/15 text-violet-300 border-violet-500/40",
  Interested: "bg-indigo-500/15 text-indigo-300 border-indigo-500/40",
  "Meeting Scheduled": "bg-blue-500/15 text-blue-300 border-blue-500/40",
  Converted: "bg-green-500/20 text-green-300 border-green-500/50",
  "Not Qualified": "bg-rose-500/10 text-rose-300 border-rose-500/30",
  "Not Interested": "bg-rose-500/10 text-rose-300 border-rose-500/30",
  "Do Not Contact": "bg-red-500/15 text-red-300 border-red-500/40",
};

export function StageBadge({ stage }: { stage: Stage | string }) {
  const c = STAGE_COLORS[stage] || "bg-zinc-700/40 text-zinc-300 border-zinc-600/50";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${c}`}>{stage}</span>
  );
}

export function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined) return null;
  const color = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-rose-400";
  return <span className={`font-mono text-lg font-bold ${color}`}>{score}%</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center text-sm text-zinc-500">{text}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-300">{children}</span>;
}
