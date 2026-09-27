"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadAll, type DataBundle } from "@/lib/api";
import { ErrorBanner } from "./ui";
import RequirementsTab from "./RequirementsTab";
import FollowUpTab from "./FollowUpTab";
import CustomersTab from "./CustomersTab";
import OemsTab from "./OemsTab";

type Tab = "requirements" | "followup" | "customers" | "oems";

const TABS: { id: Tab; label: string }[] = [
  { id: "requirements", label: "Requirements" },
  { id: "followup", label: "Follow-up today" },
  { id: "customers", label: "Customers" },
  { id: "oems", label: "OEMs" },
];

export default function Dashboard({ email }: { email: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("requirements");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<DataBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const result = await loadAll(supabase);
    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let active = true;
    // setState happens in the promise callback, not synchronously in the effect.
    loadAll(supabase).then((result) => {
      if (!active) return;
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">RAMCRM</h1>
          <p className="text-xs text-slate-500">{email}</p>
        </div>
        <button type="button" onClick={signOut} className="text-sm text-slate-600 underline">
          Sign out
        </button>
      </header>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
            {t.id === "followup" && data && data.followUp.length > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                {data.followUp.length}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-4 space-y-4">
        <ErrorBanner message={error} />

        {error && error.includes("does not exist") && (
          <p className="text-sm text-slate-600">
            The database tables or views are missing. Run{" "}
            <code className="rounded bg-slate-200 px-1">supabase/schema.sql</code> in the Supabase
            SQL Editor, then reload.
          </p>
        )}

        {loading && <p className="text-sm text-slate-500">Loading…</p>}

        {!loading && data && tab === "requirements" && (
          <RequirementsTab
            supabase={supabase}
            data={data}
            refresh={refresh}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}
        {!loading && data && tab === "followup" && (
          <FollowUpTab
            data={data}
            onOpenRequirement={(id) => {
              setSelectedId(id);
              setTab("requirements");
            }}
          />
        )}
        {!loading && data && tab === "customers" && (
          <CustomersTab supabase={supabase} data={data} refresh={refresh} />
        )}
        {!loading && data && tab === "oems" && (
          <OemsTab supabase={supabase} data={data} refresh={refresh} />
        )}
      </div>
    </div>
  );
}
