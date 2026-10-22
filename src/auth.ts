import NextAuth, { type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { authEnabled, features } from "@/lib/config";

function buildConfig(): NextAuthConfig {
  const providers: NextAuthConfig["providers"] = [];
  if (features.emailLogin)
    providers.push(
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY || process.env.RESEND_API_KEY,
        from: process.env.EMAIL_FROM || "SubAudit <onboarding@resend.dev>",
      }),
    );
  if (features.github) providers.push(GitHub);
  return {
    trustHost: true,
    secret: process.env.AUTH_SECRET || "disabled-auth-placeholder-secret",
    adapter: authEnabled && db ? DrizzleAdapter(db, { usersTable: users, accountsTable: accounts, sessionsTable: sessions, verificationTokensTable: verificationTokens }) : undefined,
    providers,
    session: { strategy: authEnabled ? "database" : "jwt" },
    pages: { signIn: "/signin", verifyRequest: "/signin?sent=1" },
    callbacks: {
      session({ session, user }) {
        if (user && session.user) session.user.id = user.id;
        return session;
      },
    },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth(buildConfig());

export async function currentUserId(): Promise<string | null> {
  if (!authEnabled) return null;
  try {
    const s = await auth();
    return s?.user?.id ?? null;
  } catch {
    return null;
  }
}
