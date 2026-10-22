import { fmtDate, fmtMoney } from "@/lib/calc";
import type { ShareData } from "@/lib/share";

export function ReportView({ data, shared }: { data: ShareData; shared?: boolean }) {
  const totals = new Map<string, { monthly: number; annual: number }>();
  let unknown = 0;
  for (const i of data.items) {
    if (i.status === "canceled") continue;
    if (i.amount == null) { unknown++; continue; }
    const t = totals.get(i.currency) ?? { monthly: 0, annual: 0 };
    t.monthly += i.cycle === "monthly" ? i.amount : i.amount / 12;
    t.annual += i.cycle === "monthly" ? i.amount * 12 : i.amount;
    totals.set(i.currency, t);
  }
  const hasNotes = data.items.some((i) => i.notes);
  return (
    <article className="print-card rounded-xl border bg-card p-6 sm:p-10">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
          <p className="text-xs text-muted-foreground">Generated {fmtDate(data.createdAt.slice(0, 10))} with SubAudit{shared ? " · read-only" : ""}</p>
        </div>
        <div className="text-right text-sm">
          {[...totals.entries()].map(([c, t]) => (
            <div key={c} className="tabular-nums"><span className="font-semibold">{fmtMoney(t.monthly, c)}</span> / mo · {fmtMoney(t.annual, c)} / yr</div>
          ))}
        </div>
      </header>
      {data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No subscriptions in this report.</p>
      ) : (
        <table className="mt-4 w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr><th className="py-2 font-medium">Name</th><th className="py-2 text-right font-medium">Cost</th><th className="hidden py-2 pl-4 font-medium sm:table-cell">Renews</th><th className="hidden py-2 pl-4 font-medium sm:table-cell">Category</th><th className="py-2 pl-4 font-medium">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {data.items.map((i, k) => (
              <tr key={k}>
                <td className="py-2">{i.name}{hasNotes && i.notes && <div className="text-xs text-muted-foreground">{i.notes}</div>}</td>
                <td className="py-2 text-right tabular-nums">{i.amount == null ? <span className="text-muted-foreground">Unknown</span> : fmtMoney(i.amount, i.currency)}<span className="text-xs text-muted-foreground"> /{i.cycle === "monthly" ? "mo" : "yr"}</span></td>
                <td className="hidden py-2 pl-4 sm:table-cell">{fmtDate(i.nextRenewal)}</td>
                <td className="hidden py-2 pl-4 sm:table-cell">{i.category}</td>
                <td className="py-2 pl-4 capitalize">{i.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer className="mt-6 border-t pt-3 text-xs text-muted-foreground">
        All figures were entered by the list owner. {unknown > 0 && `${unknown} item(s) have no price and are excluded from totals. `}Currencies are not converted. Canceled items are excluded from totals.
      </footer>
    </article>
  );
}
