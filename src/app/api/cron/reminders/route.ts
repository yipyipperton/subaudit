import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, users } from "@/db/schema";
import { json } from "@/lib/api";
import { features } from "@/lib/config";
import { daysUntil, effectiveRenewal, fmtDate, fmtMoney, todayISO } from "@/lib/calc";
import { findCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

// Runs daily via Vercel Cron. Sends opt-in emails 7 days and 1 day before renewal.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "Unauthorized" }, 401);
  if (!db || !features.emailReminders) return json({ skipped: true, reason: "Email reminders disabled (DATABASE_URL or RESEND_API_KEY missing)." });

  const today = todayISO();
  const rows = await db
    .select({ s: subscriptions, email: users.email })
    .from(subscriptions)
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .where(and(eq(subscriptions.remindEmail, true), eq(subscriptions.archived, false), isNotNull(users.email)));

  let sent = 0;
  const errors: string[] = [];
  for (const { s, email } of rows) {
    if (s.status === "canceled" || !email) continue;
    if (s.snoozedUntil && s.snoozedUntil > today) continue;
    const eff = effectiveRenewal({ nextRenewal: s.nextRenewal, cycle: s.cycle as "monthly" | "annual" }, today);
    if (!eff) continue;
    const days = daysUntil(eff, today);
    if (days !== 7 && days !== 1) continue;
    const key = `${eff}:${days}`;
    if (s.lastReminderKey === key) continue;
    const cat = findCatalog(s.name);
    const cancel = s.cancelUrl || cat?.url;
    const amount = s.amount == null ? "amount not recorded" : fmtMoney(Number(s.amount), s.currency);
    const html = `<p><strong>${escapeHtml(s.name)}</strong> renews on <strong>${fmtDate(eff)}</strong> (${days === 1 ? "tomorrow" : "in 7 days"}) — ${amount}, ${s.cycle}.</p>
<p>Still using it? No action needed.${cancel ? ` Want to cancel? <a href="${cancel}">Cancel page</a>.` : ""}</p>
<p style="color:#666;font-size:12px">You opted in to this reminder in SubAudit. Turn it off from the subscription's edit form.</p>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || "SubAudit <onboarding@resend.dev>", to: email, subject: `${s.name} renews ${days === 1 ? "tomorrow" : "in 7 days"}`, html }),
    });
    if (res.ok) {
      sent++;
      await db.update(subscriptions).set({ lastReminderKey: key }).where(eq(subscriptions.id, s.id));
    } else errors.push(`${s.id}: ${res.status}`);
  }
  return json({ checked: rows.length, sent, errors });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
