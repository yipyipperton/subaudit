import { NextResponse } from "next/server";
import { clientIp, rateLimit } from "./rate-limit";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function limited(req: Request, bucket: string, limit = 60) {
  return rateLimit(`${bucket}:${clientIp(req)}`, limit) ? null : json({ error: "Too many requests. Try again in a minute." }, 429);
}
