"use client";

import { useEffect, useState } from "react";
import { decodeShare, type ShareData } from "@/lib/share";
import { ReportView } from "@/components/report-view";
import { Button } from "@/components/ui/button";

export default function LocalShare() {
  const [data, setData] = useState<ShareData | null | undefined>(undefined);
  useEffect(() => setData(decodeShare(location.hash.slice(1))), []);
  if (data === undefined) return <main className="mx-auto max-w-3xl px-4 py-10"><div className="h-64 animate-pulse rounded-xl bg-muted" /></main>;
  if (!data) return <main className="mx-auto max-w-3xl px-4 py-20 text-center text-sm text-muted-foreground">This report link is incomplete or invalid.</main>;
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="no-print mb-4 flex justify-end"><Button variant="outline" size="sm" onClick={() => window.print()}>Print / PDF</Button></div>
      <ReportView data={data} shared />
    </main>
  );
}
