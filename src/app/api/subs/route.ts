import { z } from "zod";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { currentUserId } from "@/auth";
import { json, limited } from "@/lib/api";
import { subscriptionInput } from "@/lib/types";
import { inputToRow, listSubs } from "@/lib/subs-db";
import { newId } from "@/lib/calc";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const l = limited(req, "subs-get", 120);
  if (l) return l;
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  return json({ subscriptions: await listSubs(uid) });
}

// POST accepts a single subscription or { items: [...] } for importing a local list.
const bulk = z.object({ items: z.array(subscriptionInput).max(500) });

export async function POST(req: Request) {
  const l = limited(req, "subs-write", 60);
  if (l) return l;
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  const body = await req.json().catch(() => null);
  const asBulk = bulk.safeParse(body);
  const items = asBulk.success ? asBulk.data.items : null;
  if (!items) {
    const one = subscriptionInput.safeParse(body);
    if (!one.success) return json({ error: "Invalid data", issues: one.error.flatten() }, 400);
    const id = newId();
    await db.insert(subscriptions).values({ id, userId: uid, ...inputToRow(one.data) });
    return json({ subscriptions: await listSubs(uid) }, 201);
  }
  if (items.length) await db.insert(subscriptions).values(items.map((i) => ({ id: newId(), userId: uid, ...inputToRow(i) })));
  return json({ subscriptions: await listSubs(uid), imported: items.length }, 201);
}
