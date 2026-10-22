import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { shares } from "@/db/schema";
import { shareData } from "@/lib/share";
import { ReportView } from "@/components/report-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Shared subscription report — SubAudit", robots: { index: false } };

export default async function SharedReport({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!db || !/^[a-z0-9]{8,64}$/i.test(token)) notFound();
  const [row] = await db.select().from(shares).where(eq(shares.token, token)).limit(1);
  if (!row) notFound();
  const parsed = shareData.safeParse(row.data);
  if (!parsed.success) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <ReportView data={parsed.data} shared />
    </main>
  );
}
