"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "./native-select";
import { CURRENCIES, STATUSES, subscriptionInput, type Subscription, type SubscriptionInput } from "@/lib/types";
import { findCatalog } from "@/lib/catalog";
import { useSubs } from "./store";

type FormState = { name: string; amount: string; currency: string; cycle: "monthly" | "annual"; nextRenewal: string; category: string; cancelUrl: string; notes: string; status: SubscriptionInput["status"]; remindEmail: boolean };

const empty: FormState = { name: "", amount: "", currency: "USD", cycle: "monthly", nextRenewal: "", category: "Other", cancelUrl: "", notes: "", status: "active", remindEmail: false };

export function toForm(s: Partial<Subscription>): FormState {
  return {
    ...empty,
    ...Object.fromEntries(Object.entries(s).filter(([, v]) => v != null)),
    amount: s.amount == null ? "" : String(s.amount),
    nextRenewal: s.nextRenewal ?? "",
  } as FormState;
}

export function SubFormDialog({ open, onOpenChange, editing, initial }: { open: boolean; onOpenChange: (o: boolean) => void; editing?: Subscription | null; initial?: Partial<Subscription> }) {
  const { add, update, categories, status, mode } = useSubs();
  const [f, setF] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (open) {
      setF(editing ? toForm(editing) : initial ? toForm(initial) : empty);
      setErrors({});
      setMore(Boolean(editing?.cancelUrl || editing?.notes));
    }
  }, [open, editing, initial]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((p) => ({ ...p, [k]: v }));

  const onName = (v: string) => {
    set("name", v);
    const c = findCatalog(v);
    if (c && !editing && f.category === "Other") set("category", categories.includes(c.category) ? c.category : "Other");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = f.amount.trim() === "" ? null : Number(f.amount.replace(",", "."));
    const base = editing ?? { archived: false, snoozedUntil: null };
    const parsed = subscriptionInput.safeParse({
      ...f,
      amount: amt != null && Number.isFinite(amt) ? amt : amt === null ? null : NaN,
      nextRenewal: f.nextRenewal || null,
      archived: base.archived,
      snoozedUntil: base.snoozedUntil,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.path[0] === "amount" ? "Enter a number, or leave blank if unknown" : i.message;
      setErrors(errs);
      return;
    }
    setSaving(true);
    try {
      if (editing) await update(editing.id, parsed.data);
      else await add(parsed.data);
      onOpenChange(false);
    } catch {
      /* toast shown by store */
    } finally {
      setSaving(false);
    }
  }

  const catalog = findCatalog(f.name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>Leave the price blank if you&apos;re not sure — it stays marked as unknown rather than guessed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Field label="Name" error={errors.name}>
            <Input autoFocus value={f.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Netflix" maxLength={100} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="Cost" error={errors.amount}>
              <Input inputMode="decimal" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Unknown" />
            </Field>
            <Field label="Currency">
              <NativeSelect value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </NativeSelect>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing cycle">
              <NativeSelect value={f.cycle} onChange={(e) => set("cycle", e.target.value as FormState["cycle"])}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </NativeSelect>
            </Field>
            <Field label="Next renewal" error={errors.nextRenewal}>
              <Input type="date" value={f.nextRenewal} onChange={(e) => set("nextRenewal", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <NativeSelect value={f.category} onChange={(e) => set("category", e.target.value)}>
                {[...new Set([...categories, f.category])].map((c) => <option key={c}>{c}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Status">
              <NativeSelect value={f.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </NativeSelect>
            </Field>
          </div>
          {!more ? (
            <button type="button" className="justify-self-start text-sm text-muted-foreground underline-offset-4 hover:underline" onClick={() => setMore(true)}>
              + Cancel link, notes{mode === "cloud" ? ", email reminder" : ""}
            </button>
          ) : (
            <>
              <Field label="Cancel URL (optional)" error={errors.cancelUrl} hint={!f.cancelUrl && catalog ? `We'll suggest ${catalog.url}` : undefined}>
                <Input value={f.cancelUrl} onChange={(e) => set("cancelUrl", e.target.value)} placeholder="https://" />
              </Field>
              <Field label="Notes (optional)">
                <Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
              </Field>
            </>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={f.remindEmail} disabled={mode !== "cloud" || !status?.emailReminders} onChange={(e) => set("remindEmail", e.target.checked)} />
            <span>
              Email me 7 days and 1 day before renewal
              <span className="block text-xs text-muted-foreground">
                {mode !== "cloud" ? "Requires sign-in with cloud save on. In-app reminders work without an account." : !status?.emailReminders ? "Email sending isn't configured on this server." : "Sent to your sign-in email."}
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add subscription"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
