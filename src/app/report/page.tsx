"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Copy, Link2, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubsProvider, useSubs } from "@/components/store";
import { DashboardSkeleton } from "@/components/dashboard";
import { ReportView } from "@/components/report-view";
import { encodeShare, type ShareData } from "@/lib/share";
import { effectiveRenewal, todayISO } from "@/lib/calc";

function Builder() {
  const { ready, subs, mode } = useSubs();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [title, setTitle] = useState("Subscription report");
  const [link, setLink] = useState<string | null>(null);
  const [shares, setShares] = useState<{ token: string; title: string }[]>([]);
  const today = todayISO();

  const visible = useMemo(() => subs.filter((s) => !s.archived), [subs]);
  useEffect(() => {
    if (ready && selected === null) setSelected(new Set(visible.filter((s) => s.status !== "canceled").map((s) => s.id)));
  }, [ready, visible, selected]);
  useEffect(() => {
    if (mode === "cloud") fetch("/api/share").then((r) => r.json()).then((d) => setShares(d.shares ?? [])).catch(() => {});
  }, [mode]);

  const data: ShareData = useMemo(
    () => ({
      title: title.trim() || "Subscription report",
      createdAt: new Date().toISOString(),
      items: visible
        .filter((s) => selected?.has(s.id))
        .map((s) => ({ name: s.name, amount: s.amount, currency: s.currency, cycle: s.cycle, nextRenewal: effectiveRenewal(s, today), category: s.category, status: s.status, ...(includeNotes && s.notes ? { notes: s.notes } : {}) })),
    }),
    [visible, selected, includeNotes, title, today],
  );

  if (!ready || selected === null) return <DashboardSkeleton />;

  async function share() {
    setLink(null);
    if (mode === "cloud") {
      const r = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (!r.ok) return toast.error(d.error || "Couldn't create link");
      setLink(`${location.origin}/r/${d.token}`);
      setShares((s) => [...s, { token: d.token, title: data.title }]);
    } else {
      setLink(`${location.origin}/r/local#${encodeShare(data)}`);
    }
  }

  async function revoke(token: string) {
    await fetch("/api/share", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    setShares((s) => s.filter((x) => x.token !== token));
    toast.success("Link revoked");
  }

  const toggle = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[18rem_1fr]">
      <aside className="no-print space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Report</h1>
          <p className="mt-1 text-xs text-muted-foreground">Choose exactly what to include. Nothing else is shared — no email, no account details.</p>
          {mode === "demo" && <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Demo sample data</p>}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Title</label>
          <Input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-muted-foreground">Include</div>
          {visible.length === 0 && <p className="text-sm text-muted-foreground">No subscriptions yet. <Link className="underline" href="/app">Add some</Link>.</p>}
          {visible.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />{s.name}</label>
          ))}
          <label className="mt-3 flex items-center gap-2 border-t pt-3 text-sm"><input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />Include notes</label>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 size-4" />Print / save as PDF</Button>
          <Button onClick={share} disabled={!data.items.length}><Link2 className="mr-1 size-4" />Create read-only link</Button>
          <p className="text-xs text-muted-foreground">
            {mode === "cloud" ? "Stored as a snapshot; revoke any time below." : "The data is encoded in the link itself (after #) and never sent to our server. Anyone with the link can view it."}
          </p>
          {link && (
            <div className="flex gap-1">
              <Input readOnly value={link} className="h-8 text-xs" onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied"); }}><Copy className="size-3.5" /></Button>
            </div>
          )}
          {shares.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Active links</div>
              {shares.map((s) => (
                <div key={s.token} className="flex items-center justify-between gap-2 text-xs">
                  <a className="truncate underline" href={`/r/${s.token}`} target="_blank">{s.title}</a>
                  <button onClick={() => revoke(s.token)} aria-label="Revoke"><Trash2 className="size-3.5 text-muted-foreground" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
      <ReportView data={data} />
    </main>
  );
}

function Inner() {
  const demo = useSearchParams().get("demo") === "1";
  return <SubsProvider demo={demo}><Builder /></SubsProvider>;
}

export default function ReportPage() {
  return <Suspense fallback={<DashboardSkeleton />}><Inner /></Suspense>;
}
