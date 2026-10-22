import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";
import { authEnabled, features } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const session = authEnabled ? await auth().catch(() => null) : null;

  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Optional. SubAudit works fully without an account; signing in adds cloud backup across devices, revocable share links and email reminders.</p>

      {!authEnabled ? (
        <div className="mt-8 rounded-lg border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Sign-in is turned off on this server.</p>
          <p className="mt-1 text-muted-foreground">It needs a database, AUTH_SECRET and an email (Resend) or GitHub provider. Your list keeps working locally in this browser.</p>
          <Link href="/app" className="mt-3 inline-block underline underline-offset-4">Go to your list</Link>
        </div>
      ) : session?.user ? (
        <div className="mt-8 space-y-4 text-sm">
          <p>Signed in as <strong>{session.user.email ?? session.user.name}</strong>.</p>
          <div className="flex gap-2">
            <Link href="/app" className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-primary-foreground">Open dashboard</Link>
            <form action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}><Button variant="outline" type="submit">Sign out</Button></form>
          </div>
        </div>
      ) : sp.sent ? (
        <div className="mt-8 rounded-lg border p-4 text-sm">Check your email for a sign-in link. You can close this tab.</div>
      ) : (
        <div className="mt-8 space-y-6">
          {sp.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">Sign-in failed. Please try again.</p>}
          {features.emailLogin && (
            <form className="space-y-2" action={async (fd: FormData) => { "use server"; const email = String(fd.get("email") ?? "").trim(); if (!/^\S+@\S+\.\S+$/.test(email)) redirect("/signin?error=email"); await signIn("resend", { email, redirectTo: "/app" }); }}>
              <label className="text-xs font-medium text-muted-foreground" htmlFor="email">Email</label>
              <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              <Button className="w-full" type="submit">Email me a sign-in link</Button>
            </form>
          )}
          {features.github && (
            <form action={async () => { "use server"; await signIn("github", { redirectTo: "/app" }); }}>
              <Button variant="outline" className="w-full" type="submit">Continue with GitHub</Button>
            </form>
          )}
          <p className="text-xs text-muted-foreground">After signing in you choose whether to import the list saved in this browser. Nothing is uploaded until you do.</p>
        </div>
      )}
    </main>
  );
}
