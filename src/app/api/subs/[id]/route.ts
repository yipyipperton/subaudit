import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { currentUserId } from "@/auth";
import { json, limited } from "@/lib/api";
import { subscriptionInput } from "@/lib/types";
import { inputToRow, listSubs, ownSub } from "@/lib/subs-db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const l = limited(req, "subs-write", 60);
  if (l) return l;
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  const { id } = await params;
  const parsed = subscriptionInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid data", issues: parsed.error.flatten() }, 400);
  await db.update(subscriptions).set({ ...inputToRow(parsed.data), updatedAt: new Date() }).where(ownSub(uid, id));
  return json({ subscriptions: await listSubs(uid) });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const l = limited(req, "subs-write", 60);
  if (l) return l;
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  const { id } = await params;
  await db.delete(subscriptions).where(ownSub(uid, id));
  return json({ subscriptions: await listSubs(uid) });
}
