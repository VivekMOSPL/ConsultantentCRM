import type { ReactNode } from "react";
import type { Stage } from "@/lib/types";

export const inputClass =
  "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500";
export const btnPrimary =
  "rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50";
export const btnSecondary =
  "rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50";
export const btnDanger =
  "rounded border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}

const STAGE_COLOURS: Record<Stage, string> = {
  New: "bg-slate-100 text-slate-700",
  Quoting: "bg-blue-100 text-blue-800",
  Submitted: "bg-amber-100 text-amber-800",
  Won: "bg-green-100 text-green-800",
  Lost: "bg-red-100 text-red-800",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLOURS[stage]}`}>
      {stage}
    </span>
  );
}

export function UncoveredText({
  uncovered,
  className = "",
}: {
  uncovered: number;
  className?: string;
}) {
  if (uncovered > 0) {
    return <span className={`font-bold text-red-700 ${className}`}>Uncovered: {uncovered}</span>;
  }
  if (uncovered === 0) {
    return <span className={`font-bold text-green-700 ${className}`}>Fully covered</span>;
  }
  return (
    <span className={`font-bold text-amber-700 ${className}`}>
      Over-committed by {Math.abs(uncovered)}
    </span>
  );
}
