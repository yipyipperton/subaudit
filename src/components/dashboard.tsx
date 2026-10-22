"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, Bell, BellOff, ClipboardPaste, Cloud, ExternalLink, FileText, MoreHorizontal, Pencil, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { categoryBreakdown, computeTotals, daysUntil, effectiveRenewal, fmtDate, fmtMoney, isActive, todayISO } from "@/lib/calc";
import { STATUSES, type Status as SubStatus, type Subscription } from "@/lib/types";
import { useSubs } from "./store";
import { SubFormDialog } from "./sub-form";
import { BulkPasteDialog } from "./bulk-paste";
import { CancelHelperDialog } from "./cancel-helper";
import { CategoryChart } from "./category-chart";
import { NativeSelect } from "./native-select";

const statusStyle: Record<SubStatus, string> = {
  active: "bg-muted text-muted-foreground",
  reviewing: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  keeping: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200",
  canceling: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-200",
  canceled: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ s }: { s: SubStatus }) {
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", statusStyle[s])}>{s}</span>;
}

function plusDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function Dashboard() {
  const store = useSubs();
  const { ready, loading, error, subs, mode, patch, remove, categories, setCategories } = store;
  const params = useSearchParams();
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [cancelSub, setCancelSub] = useState<Subscription | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [st, setSt] = useState("all");
  const [sort, setSort] = useState("renewal");
  const [showArchived, setShowArchived] = useState(false);
  const [chartCur, setChartCur] = useState<string | null>(null);

  useEffect(() => {
    if (ready && params.get("add") === "1") {
      setFormOpen(true);
      router.replace("/app");
    }
  }, [ready, params, router]);

  const today = todayISO();
  const totals = useMemo(() => computeTotals(subs, today), [subs, today]);
  const currencies = totals.byCurrency.map((c) => c.currency);
  const cur = chartCur && currencies.includes(chartCur) ? chartCur : currencies[0];
  const breakdown = useMemo(() => (cur ? categoryBreakdown(subs, cur) : []), [subs, cur]);
  const upcoming = totals.upcoming.filter((u) => !(u.sub.snoozedUntil && u.sub.snoozedUntil > today));
  const notifications = upcoming.filter((u) => u.days <= 7 && !store.dismissed.includes(`${u.sub.id}|${u.date}`));

  const filtered = useMemo(() => {
    const list = subs.filter((s) => (showArchived ? s.archived || s.status === "canceled" : !s.archived)).filter((s) => {
      if (cat !== "all" && s.category !== cat) return false;
      if (st !== "all" && s.status !== st) return false;
      if (q && !`${s.name} ${s.notes} ${s.category}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const eff = (s: Subscription) => effectiveRenewal(s, today) ?? "9999";
    const monthly = (s: Subscription) => (s.amount == null ? -1 : s.cycle === "monthly" ? s.amount : s.amount / 12);
    return list.sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : sort === "cost" ? monthly(b) - monthly(a) : eff(a).localeCompare(eff(b))));
  }, [subs, q, cat, st, sort, showArchived, today]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: Subscription) => { setEditing(s); setFormOpen(true); };

  if (!ready || loading) return <DashboardSkeleton />;

  const archivedCount = subs.filter((s) => s.archived || s.status === "canceled").length;
  const visibleCount = subs.filter((s) => !s.archived).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <ModeBanner />
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span>Couldn&apos;t load your cloud list: {error}</span>
          <Button size="sm" variant="outline" onClick={store.reload}>Retry</Button>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your subscriptions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totals.activeCount} active{archivedCount ? ` · ${archivedCount} canceled/archived` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NotificationsMenu items={notifications} onDismiss={(k) => store.dismiss(k)} />
          <Link href={mode === "demo" ? "/report?demo=1" : "/report"} className={buttonVariants({ variant: "ghost", size: "sm" })}><FileText className="mr-1 size-4" />Report</Link>
          <Button variant="outline" size="sm" onClick={() => setPasteOpen(true)}><ClipboardPaste className="mr-1 size-4" />Paste statement</Button>
          <Button size="sm" onClick={openAdd}><Plus className="mr-1 size-4" />Add</Button>
        </div>
      </div>

      {subs.length === 0 ? (
        <EmptyState onAdd={openAdd} onPaste={() => setPasteOpen(true)} />
      ) : (
        <>
          <Totals totals={totals} />

          <div className="mt-8 grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-base">Renewing in the next 30 days</CardTitle>
                <CardDescription>Decide before you&apos;re charged. Snoozed items are hidden until their snooze ends.</CardDescription>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Nothing renews in the next 30 days{totals.missingDate ? ` — ${totals.missingDate} subscription${totals.missingDate === 1 ? " has" : "s have"} no renewal date yet` : ""}.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {upcoming.map(({ sub, date, days }) => (
                      <li key={sub.id} className="flex flex-wrap items-center gap-3 py-3">
                        <div className="w-16 shrink-0 text-center">
                          <div className={cn("text-lg font-semibold tabular-nums", days <= 7 && "text-rose-600 dark:text-rose-400")}>{days === 0 ? "Today" : days}</div>
                          {days > 0 && <div className="text-[11px] text-muted-foreground">day{days === 1 ? "" : "s"}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{sub.name}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(date)} · {sub.amount == null ? "amount unknown" : fmtMoney(sub.amount, sub.currency)}</div>
                        </div>
                        <NativeSelect className="h-8 w-28 text-xs" value={sub.status} onChange={(e) => patch(sub.id, { status: e.target.value as SubStatus })} aria-label="Status">
                          {["active", "reviewing", "keeping", "canceling"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                        </NativeSelect>
                        <Button size="sm" variant="ghost" title="Snooze 7 days" onClick={async () => { await patch(sub.id, { snoozedUntil: plusDays(7) }); toast.message(`${sub.name} snoozed for 7 days`); }}><BellOff className="size-4" /><span className="sr-only">Snooze</span></Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelSub(sub)}>Cancel help</Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">Monthly cost by category</CardTitle>
                  {currencies.length > 1 && (
                    <NativeSelect className="h-7 w-20 text-xs" value={cur} onChange={(e) => setChartCur(e.target.value)}>{currencies.map((c) => <option key={c}>{c}</option>)}</NativeSelect>
                  )}
                </div>
                <CardDescription>Annual plans shown as their monthly equivalent.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                <CategoryChart data={breakdown} currency={cur ?? "USD"} />
              </CardContent>
            </Card>
          </div>

          <section className="mt-10">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input className="pl-8" placeholder="Search name, notes, category" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <NativeSelect className="w-36" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category filter">
                <option value="all">All categories</option>
                {[...new Set([...categories, ...subs.map((s) => s.category)])].map((c) => <option key={c}>{c}</option>)}
              </NativeSelect>
              <NativeSelect className="w-32" value={st} onChange={(e) => setSt(e.target.value)} aria-label="Status filter">
                <option value="all">Any status</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </NativeSelect>
              <NativeSelect className="w-36" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
                <option value="renewal">Sort: renewal</option>
                <option value="cost">Sort: cost</option>
                <option value="name">Sort: name</option>
              </NativeSelect>
              {archivedCount > 0 && (
                <Button variant={showArchived ? "secondary" : "ghost"} size="sm" onClick={() => setShowArchived((v) => !v)}>
                  <Archive className="mr-1 size-4" />{showArchived ? "Showing archived" : `Archived (${archivedCount})`}
                </Button>
              )}
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">{visibleCount === 0 && !showArchived ? "Everything is archived." : "No subscriptions match these filters."}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Name</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                      <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Next renewal</th>
                      <th className="hidden px-4 py-2.5 font-medium md:table-cell">Category</th>
                      <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((s) => {
                      const eff = effectiveRenewal(s, today);
                      return (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <button className="text-left font-medium hover:underline" onClick={() => openEdit(s)}>{s.name}</button>
                            {s.notes && <div className="max-w-xs truncate text-xs text-muted-foreground">{s.notes}</div>}
                            <div className="mt-1 flex gap-2 text-xs text-muted-foreground sm:hidden">
                              <span>{eff ? fmtDate(eff) : "No date"}</span><StatusBadge s={s.status} />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {s.amount == null ? <span className="text-muted-foreground">Unknown</span> : fmtMoney(s.amount, s.currency)}
                            <div className="text-xs text-muted-foreground">{s.cycle === "monthly" ? "/ month" : "/ year"}</div>
                          </td>
                          <td className="hidden px-4 py-3 sm:table-cell">
                            {eff ? <>{fmtDate(eff)}<div className="text-xs text-muted-foreground">in {daysUntil(eff, today)} days</div></> : <span className="text-muted-foreground">Not set</span>}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell"><Badge variant="outline">{s.category}</Badge></td>
                          <td className="hidden px-4 py-3 sm:table-cell"><StatusBadge s={s.status} /></td>
                          <td className="px-2 py-3"><RowMenu s={s} onEdit={() => openEdit(s)} onCancel={() => setCancelSub(s)} patch={patch} remove={remove} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <CategoryEditor categories={categories} setCategories={setCategories} />
        </>
      )}

      <SubFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      <BulkPasteDialog open={pasteOpen} onOpenChange={setPasteOpen} />
      <CancelHelperDialog sub={cancelSub} onOpenChange={(o) => !o && setCancelSub(null)} />
    </div>
  );
}

function RowMenu({ s, onEdit, onCancel, patch, remove }: { s: Subscription; onEdit: () => void; onCancel: () => void; patch: ReturnType<typeof useSubs>["patch"]; remove: ReturnType<typeof useSubs>["remove"] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="grid size-8 place-items-center rounded-md hover:bg-muted" aria-label={`Actions for ${s.name}`}>
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 size-4" />Edit</DropdownMenuItem>
        {isActive(s) && <DropdownMenuItem onClick={onCancel}><ExternalLink className="mr-2 size-4" />Cancel help</DropdownMenuItem>}
        <DropdownMenuSeparator />
        {(["reviewing", "keeping", "canceling"] as const).map((x) => (
          <DropdownMenuItem key={x} disabled={s.status === x} onClick={() => patch(s.id, { status: x })}>Mark {x}</DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {s.archived ? (
          <DropdownMenuItem onClick={() => patch(s.id, { archived: false, status: s.status === "canceled" ? "active" : s.status })}><RotateCcw className="mr-2 size-4" />Restore</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => patch(s.id, { archived: true })}><Archive className="mr-2 size-4" />Archive</DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => { if (confirm(`Delete ${s.name}? This can't be undone.`)) remove(s.id); }}
        ><Trash2 className="mr-2 size-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Totals({ totals }: { totals: ReturnType<typeof computeTotals> }) {
  const { byCurrency, missingAmount, upcoming } = totals;
  return (
    <div>
      {byCurrency.length === 0 ? (
        <Card><CardContent className="py-6 text-sm text-muted-foreground">No costs entered yet, so there are no totals to show. Add a price to any subscription to see monthly and annual totals.</CardContent></Card>
      ) : (
        byCurrency.map((t) => (
          <div key={t.currency} className="grid gap-4 sm:grid-cols-3">
            <Stat label={`Monthly burn${byCurrency.length > 1 ? ` (${t.currency})` : ""}`} value={fmtMoney(t.monthly, t.currency)} hint="Annual plans ÷ 12" />
            <Stat label="Annual total" value={fmtMoney(t.annual, t.currency)} hint={`${t.count} with a known price`} />
            <Stat label="Due in next 30 days" value={fmtMoney(t.next30, t.currency)} hint={`${upcoming.filter((u) => u.sub.currency === t.currency).length} renewal(s)`} />
          </div>
        ))
      )}
      {(missingAmount > 0 || byCurrency.length > 1) && (
        <p className="mt-3 text-xs text-muted-foreground">
          {missingAmount > 0 && `${missingAmount} active subscription${missingAmount === 1 ? " has" : "s have"} no price and ${missingAmount === 1 ? "is" : "are"} not included in totals. `}
          {byCurrency.length > 1 && "Totals are kept per currency — we don't convert."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="mb-4 gap-1 py-5 sm:mb-0">
      <CardContent>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function NotificationsMenu({ items, onDismiss }: { items: ReturnType<typeof computeTotals>["upcoming"]; onDismiss: (k: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative")} aria-label="Notifications">
        <Bell className="size-4" />
        {items.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-rose-600 text-[10px] font-semibold text-white">{items.length}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-2">
        <div className="px-1 pb-2 text-xs font-medium text-muted-foreground">Renewing within 7 days</div>
        {items.length === 0 ? (
          <p className="px-1 py-3 text-sm text-muted-foreground">You&apos;re all caught up.</p>
        ) : (
          items.map((u) => (
            <div key={u.sub.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{u.sub.name}</div>
                <div className="text-xs text-muted-foreground">{u.days === 0 ? "today" : u.days === 1 ? "tomorrow" : `in ${u.days} days`} · {u.sub.amount == null ? "amount unknown" : fmtMoney(u.sub.amount, u.sub.currency)}</div>
              </div>
              <button className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Dismiss" onClick={() => onDismiss(`${u.sub.id}|${u.date}`)}><X className="size-3.5" /></button>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ModeBanner() {
  const { mode, status, localCount, enableCloud, disableCloud } = useSubs();
  const [importLocal, setImportLocal] = useState(true);
  if (mode === "demo")
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <span><strong>Demo — sample data.</strong> Prices are illustrative placeholders. Changes here aren&apos;t saved.</span>
        <Link href="/app" className={buttonVariants({ size: "sm" })}>Start your own list</Link>
      </div>
    );
  if (mode === "cloud")
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Cloud className="size-3.5" />Cloud save on · {status?.user?.email}</span>
        <button className="underline-offset-4 hover:underline" onClick={disableCloud}>Switch to this browser&apos;s local list</button>
      </div>
    );
  if (status?.user)
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span>Signed in as {status.user.email}. Your list is still local to this browser.</span>
        <div className="flex items-center gap-3">
          {localCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs"><input type="checkbox" checked={importLocal} onChange={(e) => setImportLocal(e.target.checked)} />Import my {localCount} local item{localCount === 1 ? "" : "s"}</label>
          )}
          <Button size="sm" onClick={() => enableCloud(importLocal)}><Cloud className="mr-1 size-4" />Turn on cloud save</Button>
        </div>
      </div>
    );
  return (
    <p className="mb-6 text-xs text-muted-foreground">
      Saved in this browser only — no account needed.{" "}
      {status?.authEnabled ? <Link href="/signin" className="underline underline-offset-4">Sign in for cloud backup & email reminders</Link> : "Cloud sign-in isn't configured on this server."}
    </p>
  );
}

function EmptyState({ onAdd, onPaste }: { onAdd: () => void; onPaste: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed px-6 py-16 text-center">
      <h2 className="text-lg font-medium">Start with the ones you remember</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Streaming, apps, cloud storage, gym, news. Add what you know — a price or date can be filled in later. Or paste lines from a bank statement and confirm what we find.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Button onClick={onAdd}><Plus className="mr-1 size-4" />Add your first subscription</Button>
        <Button variant="outline" onClick={onPaste}><ClipboardPaste className="mr-1 size-4" />Paste a statement</Button>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Want to look around first? <Link className="underline" href="/app?demo=1">Open the demo</Link> (sample data).</p>
    </div>
  );
}

function CategoryEditor({ categories, setCategories }: { categories: string[]; setCategories: (c: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  if (!open) return <button className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:underline" onClick={() => setOpen(true)}>Edit categories</button>;
  return (
    <div className="mt-6 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between"><span className="text-sm font-medium">Categories</span><button className="text-xs text-muted-foreground" onClick={() => setOpen(false)}>Done</button></div>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
            {c}
            {c !== "Other" && <button aria-label={`Remove ${c}`} onClick={() => setCategories(categories.filter((x) => x !== c))}><X className="size-3" /></button>}
          </span>
        ))}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = val.trim().slice(0, 40); if (v && !categories.includes(v)) setCategories([...categories, v]); setVal(""); }}>
        <Input className="h-8 max-w-48" value={val} onChange={(e) => setVal(e.target.value)} placeholder="New category" />
        <Button size="sm" variant="outline" type="submit">Add</Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">Removing a category doesn&apos;t change existing subscriptions.</p>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mb-8 h-8 w-56 rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-xl bg-muted" />)}</div>
      <div className="mt-8 h-64 rounded-xl bg-muted" />
    </div>
  );
}
