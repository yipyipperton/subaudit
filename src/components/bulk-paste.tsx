"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "./native-select";
import { parseStatement, type Suggestion } from "@/lib/parse";
import { CURRENCIES, type SubscriptionInput } from "@/lib/types";
import { useSubs } from "./store";
import { toast } from "sonner";

type Row = Suggestion & { keep: boolean; amountText: string };

export function BulkPasteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addMany, categories, status } = useSubs();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const reset = () => {
    setRows(null);
    setNote(null);
  };

  async function extract(ai: boolean) {
    setBusy(true);
    setNote(null);
    try {
      let s: Suggestion[];
      if (ai) {
        const r = await fetch("/api/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, ai: true }) });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        s = d.suggestions;
        setNote(d.note ?? (d.method === "ai" ? "Extracted with AI. Check every value against your statement." : null));
      } else s = parseStatement(text);
      setRows(s.map((x) => ({ ...x, keep: true, amountText: x.amount == null ? "" : String(x.amount) })));
    } catch (e) {
      toast.error((e as Error).message || "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  const upd = (i: number, p: Partial<Row>) => setRows((r) => r!.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function confirm() {
    const chosen = rows!.filter((r) => r.keep && r.name.trim());
    const items: SubscriptionInput[] = chosen.map((r) => {
      const n = r.amountText.trim() === "" ? null : Number(r.amountText.replace(",", "."));
      return {
        name: r.name.trim().slice(0, 100),
        amount: n != null && Number.isFinite(n) && n >= 0 ? n : null,
        currency: r.currency,
        cycle: r.cycle,
        nextRenewal: r.nextRenewal,
        category: r.category,
        cancelUrl: "",
        notes: "",
        status: "reviewing",
        archived: false,
        snoozedUntil: null,
        remindEmail: false,
      };
    });
    if (!items.length) return toast.message("Nothing selected.");
    try {
      await addMany(items);
      toast.success(`Added ${items.length} subscription${items.length === 1 ? "" : "s"} (marked “reviewing”).`);
      setText("");
      reset();
      onOpenChange(false);
    } catch {}
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Paste a statement or receipts</DialogTitle>
          <DialogDescription>
            We look for lines with a price or a known service name. Nothing is added until you review and confirm. {status?.ai ? "AI extraction is available and only sends the pasted text." : ""}
          </DialogDescription>
        </DialogHeader>
        {!rows ? (
          <div className="grid gap-3">
            <Textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={"NETFLIX.COM 866-579-7172  $15.49  10/03/2026\nSpotify USA  11.99 USD\nAdobe Creative Cloud annual $239.88 renews Jan 12, 2027"} className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">Tip: remove card numbers or account details before pasting. Pattern matching runs entirely in your browser.</p>
            <div className="flex flex-wrap justify-end gap-2">
              {status?.ai && <Button variant="outline" disabled={!text.trim() || busy} onClick={() => extract(true)}>{busy ? "Extracting…" : "Extract with AI"}</Button>}
              <Button disabled={!text.trim() || busy} onClick={() => extract(false)}>Find subscriptions</Button>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="grid gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">No recurring charges found. Try one charge per line, including the amount.</p>
            <Button variant="outline" className="justify-self-center" onClick={reset}>Back to text</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {note && <p className="rounded-md bg-muted px-3 py-2 text-xs">{note}</p>}
            <p className="text-sm text-muted-foreground">{rows.length} suggestion{rows.length === 1 ? "" : "s"}. Edit anything that&apos;s wrong, untick what isn&apos;t a subscription.</p>
            <div className="grid gap-3">
              {rows.map((r, i) => (
                <div key={i} data-testid="suggestion" className={`grid gap-2 rounded-lg border p-3 ${r.keep ? "" : "opacity-50"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={r.keep} onChange={(e) => upd(i, { keep: e.target.checked })} aria-label="Include" />
                    <Input value={r.name} onChange={(e) => upd(i, { name: e.target.value })} className="h-8" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Input className="h-8" value={r.amountText} placeholder="Unknown" onChange={(e) => upd(i, { amountText: e.target.value })} aria-label="Amount" />
                    <NativeSelect className="h-8" value={r.currency} onChange={(e) => upd(i, { currency: e.target.value })}>{[...new Set([...CURRENCIES, r.currency])].map((c) => <option key={c}>{c}</option>)}</NativeSelect>
                    <NativeSelect className="h-8" value={r.cycle} onChange={(e) => upd(i, { cycle: e.target.value as Row["cycle"] })}><option value="monthly">Monthly</option><option value="annual">Annual</option></NativeSelect>
                    <Input className="h-8" type="date" value={r.nextRenewal ?? ""} onChange={(e) => upd(i, { nextRenewal: e.target.value || null })} aria-label="Next renewal" />
                    <NativeSelect className="h-8" value={r.category} onChange={(e) => upd(i, { category: e.target.value })}>{[...new Set([...categories, r.category])].map((c) => <option key={c}>{c}</option>)}</NativeSelect>
                  </div>
                  {r.source && <p className="truncate font-mono text-[11px] text-muted-foreground" title={r.source}>from: {r.source}</p>}
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={reset}>Back</Button>
              <Button onClick={confirm}>Add {rows.filter((r) => r.keep).length} selected</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
