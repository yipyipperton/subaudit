import { z } from "zod";

export const DEFAULT_CATEGORIES = ["Streaming", "Software", "Fitness", "News", "Cloud", "Other"] as const;
export const STATUSES = ["active", "reviewing", "keeping", "canceling", "canceled"] as const;
export type Status = (typeof STATUSES)[number];
export const CYCLES = ["monthly", "annual"] as const;
export type Cycle = (typeof CYCLES)[number];
export const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "INR", "JPY", "Other"] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .nullable();

export const subscriptionInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  // null = unknown. We never invent a cost.
  amount: z.number().nonnegative().max(1_000_000).nullable(),
  currency: z.string().trim().min(1).max(8).default("USD"),
  cycle: z.enum(CYCLES),
  nextRenewal: dateStr,
  category: z.string().trim().min(1).max(40).default("Other"),
  cancelUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http(s)://")
    .default(""),
  notes: z.string().max(1000).default(""),
  status: z.enum(STATUSES).default("active"),
  archived: z.boolean().default(false),
  snoozedUntil: dateStr.default(null),
  remindEmail: z.boolean().default(false),
});
export type SubscriptionInput = z.infer<typeof subscriptionInput>;

export type Subscription = SubscriptionInput & {
  id: string;
  createdAt: string;
};

export const subscriptionWithId = subscriptionInput.extend({
  id: z.string().min(1).max(64),
  createdAt: z.string().max(40),
});
