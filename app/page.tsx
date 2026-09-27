import Dashboard from "@/components/Dashboard";
import { createServerSupabase } from "@/lib/supabase/server";

function SetupNotice() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">RAMCRM — database not configured</h1>
      <p className="mt-4 text-slate-700">
        This app needs a Supabase project URL and anon public key.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-6 text-slate-700">
        <li>
          Run <code className="rounded bg-slate-200 px-1">supabase/schema.sql</code> in the
          Supabase SQL Editor.
        </li>
        <li>
          Turn on Authentication → Providers → Email, and disable public sign-up. Create one user.
        </li>
        <li>
          Copy <code className="rounded bg-slate-200 px-1">.env.local.example</code> to{" "}
          <code className="rounded bg-slate-200 px-1">.env.local</code> and paste the Project URL
          and anon public key.
        </li>
        <li>Restart the dev server.</li>
      </ol>
    </main>
  );
}

export default async function Home() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return <SetupNotice />;
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy redirects signed-out visitors; this is the belt-and-braces check.
  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-bold">Please sign in</h1>
        <a className="mt-4 inline-block text-blue-700 underline" href="/login">
          Go to sign in
        </a>
      </main>
    );
  }

  return <Dashboard email={user.email ?? ""} />;
}
