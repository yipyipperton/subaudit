import { z } from "zod";

// Minimal, user-selected fields only. Notes are excluded unless the user opts in.
export const shareItem = z.object({
  name: z.string().max(100),
  amount: z.number().nullable(),
  currency: z.string().max(8),
  cycle: z.enum(["monthly", "annual"]),
  nextRenewal: z.string().nullable(),
  category: z.string().max(40),
  status: z.string().max(20),
  notes: z.string().max(1000).optional(),
});
export const shareData = z.object({
  title: z.string().max(80).default("Subscription report"),
  createdAt: z.string().max(40),
  items: z.array(shareItem).max(200),
});
export type ShareData = z.infer<typeof shareData>;

export function encodeShare(d: ShareData): string {
  const bytes = new TextEncoder().encode(JSON.stringify(d));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeShare(s: string): ShareData | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return shareData.parse(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
