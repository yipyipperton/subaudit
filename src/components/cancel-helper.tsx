"use client";

import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { findCatalog, GENERIC_STEPS } from "@/lib/catalog";
import type { Subscription } from "@/lib/types";
import { useSubs } from "./store";
import { toast } from "sonner";

export function CancelHelperDialog({ sub, onOpenChange }: { sub: Subscription | null; onOpenChange: (o: boolean) => void }) {
  const { patch } = useSubs();
  if (!sub) return null;
  const c = findCatalog(sub.name);
  const url = sub.cancelUrl || c?.url;
  const steps = c?.steps ?? GENERIC_STEPS;
  return (
    <Dialog open={Boolean(sub)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cancel {sub.name}</DialogTitle>
          <DialogDescription>{c ? `Steps for ${c.name}. Providers change their pages — if something looks different, look for Account → Subscription.` : "We don't have specific steps for this service. General guidance:"}</DialogDescription>
        </DialogHeader>
        <ol className="grid list-decimal gap-2 pl-5 text-sm">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        {c && <p className="text-xs text-muted-foreground">Billed through Apple, Google Play, Amazon or a carrier? Cancel with them instead.</p>}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted">
              Open cancel page <ExternalLink className="size-3.5" />
            </a>
          )}
          <Button variant="outline" onClick={async () => { await patch(sub.id, { status: "canceling" }); toast.success("Marked as canceling"); onOpenChange(false); }}>Mark canceling</Button>
          <Button onClick={async () => { await patch(sub.id, { status: "canceled", archived: true, remindEmail: false }); toast.success(`${sub.name} marked canceled and archived`); onOpenChange(false); }}>I canceled it — archive</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
