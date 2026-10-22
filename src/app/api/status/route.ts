import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { authEnabled, features } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  let user: { id: string; email?: string | null; name?: string | null } | null = null;
  if (authEnabled) {
    try {
      const s = await auth();
      if (s?.user?.id) user = { id: s.user.id, email: s.user.email, name: s.user.name };
    } catch {}
  }
  return NextResponse.json({
    authEnabled,
    providers: { email: authEnabled && features.emailLogin, github: authEnabled && features.github },
    ai: features.ai,
    emailReminders: features.emailReminders && authEnabled,
    user,
  });
}
