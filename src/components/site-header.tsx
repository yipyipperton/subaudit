import Link from "next/link";
import { ThemeToggle } from "./theme";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-foreground text-xs font-bold text-background">SA</span>
          SubAudit
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/app" className="hover:text-foreground">Dashboard</Link>
          <Link href="/cancel" className="hover:text-foreground">Cancel help</Link>
          <Link href="/report" className="hidden hover:text-foreground sm:inline">Report</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/signin" className="text-sm text-muted-foreground hover:text-foreground">Account</Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
