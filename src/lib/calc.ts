import type { Subscription } from "./types";

export function todayISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addCycle(d: Date, cycle: Subscription["cycle"]): Date {
  const r = new Date(d);
  const day = r.getDate();
  if (cycle === "monthly") r.setMonth(r.getMonth() + 1);
  else r.setFullYear(r.getFullYear() + 1);
  // clamp month overflow (e.g. Jan 31 -> Feb 28)
  if (r.getDate() !== day) r.setDate(0);
  return r;
}

/** Next renewal on/after today, rolling a stale stored date forward by its cycle. null if unknown. */
export function effectiveRenewal(s: Pick<Subscription, "nextRenewal" | "cycle">, today = todayISO()): string | null {
  if (!s.nextRenewal) return null;
  let d = parseISO(s.nextRenewal);
  const t = parseISO(today);
  let guard = 0;
  while (d < t && guard++ < 1000) d = addCycle(d, s.cycle);
  return todayISO(d);
}

export function daysUntil(dateISO: string, today = todayISO()): number {
  return Math.round((parseISO(dateISO).getTime() - parseISO(today).getTime()) / 86_400_000);
}

export function isActive(s: Subscription) {
  return !s.archived && s.status !== "canceled";
}

export function monthlyEquivalent(s: Subscription): number | null {
  if (s.amount == null) return null;
  return s.cycle === "monthly" ? s.amount : s.amount / 12;
}

export type CurrencyTotals = { currency: string; monthly: number; annual: number; next30: number; count: number };

/** Totals are grouped per currency — we never convert currencies or guess missing amounts. */
export function computeTotals(subs: Subscription[], today = todayISO()) {
  const active = subs.filter(isActive);
  const map = new Map<string, CurrencyTotals>();
  let missingAmount = 0;
  let missingDate = 0;
  const upcoming: { sub: Subscription; date: string; days: number }[] = [];
  for (const s of active) {
    const eff = effectiveRenewal(s, today);
    if (!eff) missingDate++;
    if (s.amount == null) {
      missingAmount++;
    } else {
      const t = map.get(s.currency) ?? { currency: s.currency, monthly: 0, annual: 0, next30: 0, count: 0 };
      t.monthly += monthlyEquivalent(s)!;
      t.annual += s.cycle === "monthly" ? s.amount * 12 : s.amount;
      t.count++;
      if (eff && daysUntil(eff, today) <= 30) t.next30 += s.amount;
      map.set(s.currency, t);
    }
    if (eff) {
      const days = daysUntil(eff, today);
      if (days <= 30) upcoming.push({ sub: s, date: eff, days });
    }
  }
  upcoming.sort((a, b) => a.days - b.days);
  const byCurrency = [...map.values()].sort((a, b) => b.monthly - a.monthly);
  return { byCurrency, upcoming, missingAmount, missingDate, activeCount: active.length };
}

export function categoryBreakdown(subs: Subscription[], currency: string) {
  const m = new Map<string, number>();
  for (const s of subs.filter(isActive)) {
    if (s.currency !== currency) continue;
    const v = monthlyEquivalent(s);
    if (v == null) continue;
    m.set(s.category, (m.get(s.category) ?? 0) + v);
  }
  return [...m.entries()].map(([category, monthly]) => ({ category, monthly: Math.round(monthly * 100) / 100 })).sort((a, b) => b.monthly - a.monthly);
}

export function fmtMoney(n: number | null | undefined, currency: string) {
  if (n == null) return "—";
  try {
    if (currency === "Other") return n.toFixed(2);
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return parseISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
