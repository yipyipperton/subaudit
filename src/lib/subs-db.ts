import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import type { Subscription, SubscriptionInput } from "./types";

type Row = typeof subscriptions.$inferSelect;

export function rowToSub(r: Row): Subscription {
  return {
    id: r.id,
    name: r.name,
    amount: r.amount == null ? null : Number(r.amount),
    currency: r.currency,
    cycle: r.cycle as Subscription["cycle"],
    nextRenewal: r.nextRenewal,
    category: r.category,
    cancelUrl: r.cancelUrl,
    notes: r.notes,
    status: r.status as Subscription["status"],
    archived: r.archived,
    snoozedUntil: r.snoozedUntil,
    remindEmail: r.remindEmail,
    createdAt: r.createdAt.toISOString(),
  };
}

export function inputToRow(i: SubscriptionInput) {
  return { ...i, amount: i.amount == null ? null : i.amount.toFixed(2) };
}

export async function listSubs(userId: string) {
  const rows = await db!.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(subscriptions.createdAt);
  return rows.map(rowToSub);
}

export function ownSub(userId: string, id: string) {
  return and(eq(subscriptions.userId, userId), eq(subscriptions.id, id));
}
