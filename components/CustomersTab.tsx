"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCustomer, deleteCustomer, updateCustomer, type DataBundle } from "@/lib/api";
import { Card, EmptyState, ErrorBanner, Field, btnDanger, btnPrimary, btnSecondary, inputClass } from "./ui";

type Draft = { name: string; contact_name: string; email: string; phone: string; notes: string };

const blank: Draft = { name: "", contact_name: "", email: "", phone: "", notes: "" };

export default function CustomersTab({
  supabase,
  data,
  refresh,
}: {
  supabase: SupabaseClient;
  data: DataBundle;
  refresh: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = editingId
      ? await updateCustomer(supabase, editingId, draft)
      : await createCustomer(supabase, draft);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setDraft(blank);
    setEditingId(null);
    await refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Customers</h2>

      <Card>
        <form onSubmit={submit} className="space-y-3">
          <ErrorBanner message={error} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="e.g. Directorate of Procurement"
              />
            </Field>
            <Field label="Contact name">
              <input
                className={inputClass}
                value={draft.contact_name}
                onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              className={inputClass}
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </Field>
          <div className="flex gap-2">
            <button type="submit" className={btnPrimary} disabled={busy}>
              {editingId ? "Save changes" : "Add customer"}
            </button>
            {editingId && (
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setEditingId(null);
                  setDraft(blank);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>

      {data.customers.length === 0 ? (
        <EmptyState>No customers yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {data.customers.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-slate-600">
                    {[c.contact_name, c.email, c.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                  {c.notes && <p className="mt-1 text-xs text-slate-500">{c.notes}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => {
                      setEditingId(c.id);
                      setDraft({
                        name: c.name,
                        contact_name: c.contact_name ?? "",
                        email: c.email ?? "",
                        phone: c.phone ?? "",
                        notes: c.notes ?? "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className={btnDanger}
                    disabled={busy}
                    onClick={() => {
                      if (!confirm(`Delete ${c.name}?`)) return;
                      (async () => {
                        setBusy(true);
                        setError(null);
                        const err = await deleteCustomer(supabase, c.id);
                        setBusy(false);
                        if (err) setError(err);
                        else await refresh();
                      })();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
