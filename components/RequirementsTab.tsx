"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequirement, type DataBundle, type NewLineItem } from "@/lib/api";
import { formatDate, formatINR, parseQuantity, rupeesToPaise, todayISO } from "@/lib/format";
import { STAGES, type Stage } from "@/lib/types";
import RequirementDetail from "./RequirementDetail";
import {
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  StageBadge,
  UncoveredText,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "./ui";

type DraftLine = { item: string; quantity: string; unit_price: string };

const emptyLine: DraftLine = { item: "", quantity: "", unit_price: "" };

export default function RequirementsTab({
  supabase,
  data,
  refresh,
  selectedId,
  onSelect,
}: {
  supabase: SupabaseClient;
  data: DataBundle;
  refresh: () => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const selected = selectedId
    ? data.requirements.find((r) => r.id === selectedId) ?? null
    : null;

  if (selected) {
    return (
      <RequirementDetail
        supabase={supabase}
        data={data}
        requirement={selected}
        refresh={refresh}
        onBack={() => onSelect(null)}
      />
    );
  }

  return (
    <RequirementList
      supabase={supabase}
      data={data}
      refresh={refresh}
      onSelect={onSelect}
    />
  );
}

function RequirementList({
  supabase,
  data,
  refresh,
  onSelect,
}: {
  supabase: SupabaseClient;
  data: DataBundle;
  refresh: () => Promise<void>;
  onSelect: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<Stage>("New");
  const [deadline, setDeadline] = useState(todayISO());
  const [followUp, setFollowUp] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ ...emptyLine }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!customerId) return setError("Choose a customer.");
    if (!title.trim()) return setError("Title is required.");
    if (!deadline) return setError("Submission deadline is required.");

    const parsed: NewLineItem[] = [];
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.item.trim()) return setError(`Line ${i + 1}: item name is required.`);
      const qty = parseQuantity(raw.quantity);
      if (qty === null) return setError(`Line ${i + 1}: quantity must be a whole number above zero.`);
      const paise = rupeesToPaise(raw.unit_price);
      if (paise === null) return setError(`Line ${i + 1}: unit price must be a non-negative amount.`);
      parsed.push({ item: raw.item, quantity: qty, unit_price_paise: paise });
    }
    if (parsed.length === 0) return setError("Add at least one line item.");

    setBusy(true);
    const err = await createRequirement(supabase, {
      customer_id: customerId,
      title,
      stage,
      submission_deadline: deadline,
      follow_up_date: followUp || null,
      notes,
      lineItems: parsed,
    });
    setBusy(false);

    if (err) {
      setError(err);
      return;
    }
    // Reset only after a successful save.
    setTitle("");
    setNotes("");
    setFollowUp("");
    setLines([{ ...emptyLine }]);
    setShowForm(false);
    await refresh();
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Requirements</h2>
        <button
          type="button"
          className={showForm ? btnSecondary : btnPrimary}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "New requirement"}
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={submit} className="space-y-3">
            <ErrorBanner message={error} />

            {data.customers.length === 0 && (
              <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Add a customer on the Customers tab first.
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer">
                <select
                  className={inputClass}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">Select a customer…</option>
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Stage">
                <select
                  className={inputClass}
                  value={stage}
                  onChange={(e) => setStage(e.target.value as Stage)}
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Title">
                <input
                  className={inputClass}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5.56mm ammunition supply"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Submission deadline">
                  <input
                    type="date"
                    className={inputClass}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                  />
                </Field>
                <Field label="Follow-up date (optional)">
                  <input
                    type="date"
                    className={inputClass}
                    value={followUp}
                    onChange={(e) => setFollowUp(e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <Field label="Notes (optional)">
              <textarea
                className={inputClass}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div>
              <p className="text-sm font-medium text-slate-700">Line items</p>
              <div className="mt-1 space-y-2">
                {lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2">
                    <input
                      className={`${inputClass} col-span-6 mt-0`}
                      placeholder="Item"
                      value={l.item}
                      onChange={(e) => updateLine(i, { item: e.target.value })}
                    />
                    <input
                      className={`${inputClass} col-span-2 mt-0`}
                      placeholder="Qty"
                      inputMode="numeric"
                      value={l.quantity}
                      onChange={(e) => updateLine(i, { quantity: e.target.value })}
                    />
                    <input
                      className={`${inputClass} col-span-3 mt-0`}
                      placeholder="Unit price ₹"
                      inputMode="decimal"
                      value={l.unit_price}
                      onChange={(e) => updateLine(i, { unit_price: e.target.value })}
                    />
                    <button
                      type="button"
                      className="col-span-1 text-sm text-red-600 disabled:opacity-30"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-2 text-sm text-blue-700 underline"
                onClick={() => setLines((prev) => [...prev, { ...emptyLine }])}
              >
                Add line
              </button>
            </div>

            <button type="submit" className={btnPrimary} disabled={busy}>
              {busy ? "Saving…" : "Create requirement"}
            </button>
          </form>
        </Card>
      )}

      {data.requirements.length === 0 ? (
        <EmptyState>No requirements yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.requirements.map((r) => {
            const customer = data.customers.find((c) => c.id === r.customer_id);
            return (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelect(r.id)}
                      className="text-left font-medium hover:underline"
                    >
                      {r.title}
                    </button>
                    <p className="text-sm text-slate-600">{customer?.name ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Deadline {formatDate(r.submission_deadline)}
                      {r.follow_up_date ? ` · Follow-up ${formatDate(r.follow_up_date)}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Govt {r.government_quantity} · Committed {r.committed_quantity} · Value{" "}
                      {formatINR(r.government_value_paise)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StageBadge stage={r.stage} />
                    <UncoveredText uncovered={r.uncovered_quantity} className="text-sm" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
