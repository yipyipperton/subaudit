import Link from "next/link";
import { ArrowRight, Bell, FileText, ListChecks, ShieldCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const points = [
  { icon: ListChecks, title: "One honest list", body: "Name, price, cycle, renewal date. Totals come only from what you enter — unknown amounts stay marked unknown." },
  { icon: Bell, title: "Reminders before renewals", body: "See what renews in the next 30 days. Opt in to email reminders 7 days and 1 day ahead." },
  { icon: ShieldCheck, title: "No bank linking", body: "Works fully in your browser with no account. Sign in only if you want cloud backup." },
  { icon: FileText, title: "Cancel help & reports", body: "Direct links to official cancel pages, plus a printable or shareable read-only report." },
];

export default function Home() {
  return (
    <main>
      <section className="mx-auto max-w-3xl px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
        <p className="mb-4 text-sm font-medium text-muted-foreground">Subscription audit · renewal reminders</p>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Know what you pay for. Decide what stays.</h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Subscriptions are easy to start and easy to forget. SubAudit is a plain list of yours, what they cost, and when they renew — so you can review each one before the next charge.
          We don&apos;t connect to your bank, estimate &ldquo;savings&rdquo;, or invent numbers. Everything shown comes from what you enter.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/app?add=1" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6")}>
            Add your first subscription <ArrowRight className="ml-1 size-4" />
          </Link>
          <Link href="/app?demo=1" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-11 px-6")}>
            Try the demo
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">The demo uses clearly labeled sample data and saves nothing.</p>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:grid-cols-2 sm:px-6">
          {points.map((p) => (
            <div key={p.title} className="flex gap-4">
              <p.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div>
                <h2 className="font-medium">{p.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-muted-foreground sm:px-6">
        SubAudit stores data in your browser by default. Cloud save is opt-in. Open source on{" "}
        <a className="underline" href="https://github.com/yipyipperton/subaudit">GitHub</a>.
      </footer>
    </main>
  );
}
