import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { shares } from "@/db/schema";
import { currentUserId } from "@/auth";
import { json, limited } from "@/lib/api";
import { shareData } from "@/lib/share";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  void req;
  const rows = await db.select({ token: shares.token, title: shares.title, createdAt: shares.createdAt }).from(shares).where(eq(shares.userId, uid));
  return json({ shares: rows });
}

export async function POST(req: Request) {
  const l = limited(req, "share", 20);
  if (l) return l;
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  const parsed = shareData.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid report data" }, 400);
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  await db.insert(shares).values({ token, userId: uid, title: parsed.data.title, data: parsed.data });
  return json({ token }, 201);
}

export async function DELETE(req: Request) {
  const uid = await currentUserId();
  if (!uid || !db) return json({ error: "Not signed in" }, 401);
  const { token } = z.object({ token: z.string().max(64) }).parse(await req.json().catch(() => ({})));
  await db.delete(shares).where(and(eq(shares.userId, uid), eq(shares.token, token)));
  return json({ ok: true });
}
