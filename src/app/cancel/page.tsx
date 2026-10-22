import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { CATALOG, GENERIC_STEPS } from "@/lib/catalog";

export const metadata: Metadata = { title: "Cancel help — SubAudit" };

export default function CancelPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">How to cancel</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Links go to each provider&apos;s own account page or official help article. If you pay through Apple, Google Play, Amazon or a carrier, cancel there instead. Pages change — the steps describe where to look.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {CATALOG.map((c) => (
          <div key={c.slug} id={c.slug} className="rounded-xl border p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-medium">{c.name}</h2>
                <p className="text-xs text-muted-foreground">{c.category}</p>
              </div>
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted">
                Cancel page <ExternalLink className="size-3" />
              </a>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {c.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>
      <div className="mt-10 rounded-xl bg-muted/50 p-5">
        <h2 className="font-medium">Not listed?</h2>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          {GENERIC_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
    </main>
  );
}
