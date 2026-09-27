"use client";

import { useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addLineItem,
  addShipment,
  deleteLineItem,
  deleteRequirement,
  deleteShipment,
  linkOem,
  setStage,
  unlinkOem,
  updateRequirement,
  type DataBundle,
} from "@/lib/api";
import { formatDate, formatINR, parseQuantity, rupeesToPaise, todayISO } from "@/lib/format";
import { STAGES, type QuoteLine, type Stage } from "@/lib/types";
import {
  Card,
  ErrorBanner,
  Field,
  StageBadge,
  UncoveredText,
  btnDanger,
  btnPrimary,
  btnSecondary,
  inputClass,
} from "./ui";

export default function RequirementDetail({
  supabase,
  data,
  requirement,
  refresh,
  onBack,
}: {
  supabase: SupabaseClient;
  data: DataBundle;
  requirement: DataBundle["requirements"][number];
  refresh: () => Promise<void>;
  onBack: () => void;
}) {
  const customer = data.customers.find((c) => c.id === requirement.customer_id);
  const lines = data.lineItems.filter((l) => l.requirement_id === requirement.id);
  const links = data.reqOems.filter((l) => l.requirement_id === requirement.id);

  const shipmentsFor = (linkId: string) =>
    data.shipments.filter((s) => s.requirement_oem_id === linkId);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const [edit, setEdit] = useState({
    customer_id: requirement.customer_id,
    title: requirement.title,
    stage: requirement.stage,
    submission_deadline: requirement.submission_deadline,
    follow_up_date: requirement.follow_up_date ?? "",
    notes: requirement.notes ?? "",
  });

  const [line, setLine] = useState({ item: "", quantity: "", unit_price: "" });
  const [linkOemId, setLinkOemId] = useState("");
  const [shipment, setShipment] = useState<Record<string, { quantity: string; date: string }>>({});

  const pastQuotes = useMemo(() => {
    const groups = new Map<string, { title: string; stage: Stage; deadline: string; lines: QuoteLine[] }>();
    for (const q of data.quoteLines) {
      if (q.customer_id !== requirement.customer_id) continue;
      if (q.requirement_id === requirement.id) continue;
      let g = groups.get(q.requirement_id);
      if (!g) {
        g = { title: q.title, stage: q.stage, deadline: q.submission_deadline, lines: [] };
        groups.set(q.requirement_id, g);
      }
      g.lines.push(q);
    }
    return [...groups.values()];
  }, [data.quoteLines, requirement.customer_id, requirement.id]);

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const err = await action();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    await refresh();
  }

  const unlinkedOems = data.oems.filter((o) => !links.some((l) => l.oem_id === o.id));

  return (
    <section className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-slate-600 underline">
        ← All requirements
      </button>

      <ErrorBanner message={error} />

      {/* Uncovered quantity — the headline number, in bold at the top. */}
      <Card className="border-slate-300">
        <p className="text-sm font-medium text-slate-500">Uncovered quantity</p>
        <p className="mt-1 text-4xl font-bold tabular-nums">
          {requirement.uncovered_quantity}
        </p>
        <UncoveredText uncovered={requirement.uncovered_quantity} className="text-sm" />
        <p className="mt-2 text-xs text-slate-500">
          Government {requirement.government_quantity} − committed {requirement.committed_quantity}{" "}
          = {requirement.uncovered_quantity}. Government quantity is the sum of line items.
        </p>
      </Card>

      <Card>
        {!editing ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{requirement.title}</h2>
                <p className="text-sm text-slate-600">{customer?.name ?? "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StageBadge stage={requirement.stage} />
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => {
                    setEdit({
                      customer_id: requirement.customer_id,
                      title: requirement.title,
                      stage: requirement.stage,
                      submission_deadline: requirement.submission_deadline,
                      follow_up_date: requirement.follow_up_date ?? "",
                      notes: requirement.notes ?? "",
                    });
                    setEditing(true);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Deadline {formatDate(requirement.submission_deadline)} · Follow-up{" "}
              {formatDate(requirement.follow_up_date)}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">Move stage:</span>
              <select
                className="rounded border border-slate-300 px-2 py-1 text-sm"
                value={requirement.stage}
                disabled={busy}
                onChange={(e) => run(() => setStage(supabase, requirement.id, e.target.value as Stage))}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {requirement.notes && (
              <p className="whitespace-pre-wrap text-sm text-slate-600">{requirement.notes}</p>
            )}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() =>
                updateRequirement(supabase, requirement.id, {
                  customer_id: edit.customer_id,
                  title: edit.title,
                  stage: edit.stage,
                  submission_deadline: edit.submission_deadline,
                  follow_up_date: edit.follow_up_date || null,
                  notes: edit.notes,
                }).then((err) => {
                  if (!err) setEditing(false);
                  return err;
                }),
              );
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Customer">
                <select
                  className={inputClass}
                  value={edit.customer_id}
                  onChange={(e) => setEdit({ ...edit, customer_id: e.target.value })}
                >
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
                  value={edit.stage}
                  onChange={(e) => setEdit({ ...edit, stage: e.target.value as Stage })}
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
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Deadline">
                  <input
                    type="date"
                    className={inputClass}
                    value={edit.submission_deadline}
                    onChange={(e) => setEdit({ ...edit, submission_deadline: e.target.value })}
                  />
                </Field>
                <Field label="Follow-up">
                  <input
                    type="date"
                    className={inputClass}
                    value={edit.follow_up_date}
                    onChange={(e) => setEdit({ ...edit, follow_up_date: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <Field label="Notes">
              <textarea
                className={inputClass}
                rows={2}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2">
              <button type="submit" className={btnPrimary} disabled={busy}>
                Save
              </button>
              <button type="button" className={btnSecondary} onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* Line items */}
      <Card>
        <h3 className="font-semibold">Line items</h3>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No line items.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-1">Item</th>
                <th className="py-1 text-right">Qty</th>
                <th className="py-1 text-right">Unit price</th>
                <th className="py-1 text-right">Value</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1">{l.item}</td>
                  <td className="py-1 text-right tabular-nums">{l.quantity}</td>
                  <td className="py-1 text-right tabular-nums">{formatINR(l.unit_price_paise)}</td>
                  <td className="py-1 text-right tabular-nums">
                    {formatINR(l.quantity * l.unit_price_paise)}
                  </td>
                  <td className="py-1 text-right">
                    <button
                      type="button"
                      className="text-red-600 disabled:opacity-30"
                      disabled={busy}
                      onClick={() => run(() => deleteLineItem(supabase, l.id))}
                      aria-label="Delete line item"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-slate-200 font-medium">
                <td className="py-1">Total</td>
                <td className="py-1 text-right tabular-nums">{requirement.government_quantity}</td>
                <td></td>
                <td className="py-1 text-right tabular-nums">
                  {formatINR(requirement.government_value_paise)}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}

        <form
          className="mt-3 grid grid-cols-12 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const qty = parseQuantity(line.quantity);
            if (qty === null) return setError("Quantity must be a whole number above zero.");
            const paise = rupeesToPaise(line.unit_price);
            if (paise === null) return setError("Unit price must be a non-negative amount.");
            run(async () => {
              const err = await addLineItem(supabase, requirement.id, {
                item: line.item,
                quantity: qty,
                unit_price_paise: paise,
              });
              if (!err) setLine({ item: "", quantity: "", unit_price: "" });
              return err;
            });
          }}
        >
          <input
            className={`${inputClass} col-span-6 mt-0`}
            placeholder="Item"
            value={line.item}
            onChange={(e) => setLine({ ...line, item: e.target.value })}
          />
          <input
            className={`${inputClass} col-span-2 mt-0`}
            placeholder="Qty"
            inputMode="numeric"
            value={line.quantity}
            onChange={(e) => setLine({ ...line, quantity: e.target.value })}
          />
          <input
            className={`${inputClass} col-span-3 mt-0`}
            placeholder="Unit price ₹"
            inputMode="decimal"
            value={line.unit_price}
            onChange={(e) => setLine({ ...line, unit_price: e.target.value })}
          />
          <button type="submit" className={`${btnPrimary} col-span-1`} disabled={busy}>
            Add
          </button>
        </form>
      </Card>

      {/* OEMs and shipments */}
      <Card>
        <h3 className="font-semibold">OEM commitments</h3>
        <p className="text-xs text-slate-500">
          Each OEM can hold many shipments. The committed quantity is the sum of its shipments.
        </p>

        {links.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No OEMs linked yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {links.map((l) => {
              const oem = data.oems.find((o) => o.id === l.oem_id);
              const ships = shipmentsFor(l.id);
              const committed = ships.reduce((sum, s) => sum + s.quantity, 0);
              const s = shipment[l.id] ?? { quantity: "", date: todayISO() };
              return (
                <div key={l.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{oem?.name ?? "Unknown OEM"}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums text-slate-600">
                        Committed: <strong>{committed}</strong>
                      </span>
                      <button
                        type="button"
                        className="text-sm text-red-600 disabled:opacity-30"
                        disabled={busy}
                        onClick={() => run(() => unlinkOem(supabase, l.id))}
                      >
                        Unlink
                      </button>
                    </div>
                  </div>

                  {ships.length > 0 && (
                    <table className="mt-2 w-full text-sm">
                      <tbody>
                        {ships.map((sh) => (
                          <tr key={sh.id} className="border-t border-slate-100">
                            <td className="py-1 text-slate-600">
                              Shipment {formatDate(sh.expected_shipment_date)}
                            </td>
                            <td className="py-1 text-right tabular-nums">{sh.quantity}</td>
                            <td className="w-8 py-1 text-right">
                              <button
                                type="button"
                                className="text-red-600 disabled:opacity-30"
                                disabled={busy}
                                onClick={() => run(() => deleteShipment(supabase, sh.id))}
                                aria-label="Delete shipment"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <form
                    className="mt-2 grid grid-cols-12 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const qty = parseQuantity(s.quantity);
                      if (qty === null) return setError("Shipment quantity must be above zero.");
                      if (!s.date) return setError("Expected shipment date is required.");
                      run(async () => {
                        const err = await addShipment(supabase, l.id, {
                          quantity: qty,
                          expected_shipment_date: s.date,
                        });
                        if (!err) setShipment((prev) => ({ ...prev, [l.id]: { quantity: "", date: s.date } }));
                        return err;
                      });
                    }}
                  >
                    <input
                      className={`${inputClass} col-span-4 mt-0`}
                      placeholder="Qty"
                      inputMode="numeric"
                      value={s.quantity}
                      onChange={(e) =>
                        setShipment((prev) => ({ ...prev, [l.id]: { ...s, quantity: e.target.value } }))
                      }
                    />
                    <input
                      type="date"
                      className={`${inputClass} col-span-5 mt-0`}
                      value={s.date}
                      onChange={(e) =>
                        setShipment((prev) => ({ ...prev, [l.id]: { ...s, date: e.target.value } }))
                      }
                    />
                    <button type="submit" className={`${btnPrimary} col-span-3`} disabled={busy}>
                      Add shipment
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem]">
            <Field label="Link an OEM">
              <select
                className={inputClass}
                value={linkOemId}
                onChange={(e) => setLinkOemId(e.target.value)}
              >
                <option value="">Select an OEM…</option>
                {unlinkedOems.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={busy || !linkOemId}
            onClick={() =>
              run(async () => {
                const err = await linkOem(supabase, requirement.id, linkOemId);
                if (!err) setLinkOemId("");
                return err;
              })
            }
          >
            Link
          </button>
          {data.oems.length === 0 && (
            <span className="text-sm text-slate-500">Add OEMs on the OEMs tab first.</span>
          )}
        </div>
      </Card>

      {/* Past quotes for this customer */}
      <Card>
        <h3 className="font-semibold">Past quotes from {customer?.name ?? "this customer"}</h3>
        <p className="text-xs text-slate-500">
          Earlier requirements and their prices. Lost bids are marked.
        </p>

        {pastQuotes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No earlier quotes for this customer.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {pastQuotes.map((q, idx) => (
              <div
                key={idx}
                className={`rounded border p-3 ${
                  q.stage === "Lost" ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{q.title}</p>
                  <div className="flex items-center gap-2">
                    {q.stage === "Lost" && (
                      <span className="rounded bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-800">
                        LOST BID
                      </span>
                    )}
                    <StageBadge stage={q.stage} />
                  </div>
                </div>
                <p className="text-xs text-slate-500">Deadline {formatDate(q.deadline)}</p>
                <table className="mt-1 w-full text-sm">
                  <tbody>
                    {q.lines.map((ln) => (
                      <tr key={ln.line_item_id} className="border-t border-slate-100">
                        <td className="py-1">{ln.item}</td>
                        <td className="py-1 text-right tabular-nums">{ln.quantity}</td>
                        <td className="py-1 text-right tabular-nums">
                          {formatINR(ln.unit_price_paise)}
                        </td>
                        <td className="py-1 text-right tabular-nums">
                          {formatINR(ln.line_value_paise)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div>
        <button
          type="button"
          className={btnDanger}
          disabled={busy}
          onClick={() => {
            if (!confirm("Delete this requirement and all its line items, OEM links and shipments?")) {
              return;
            }
            run(async () => {
              const err = await deleteRequirement(supabase, requirement.id);
              if (!err) onBack();
              return err;
            });
          }}
        >
          Delete requirement
        </button>
      </div>
    </section>
  );
}
