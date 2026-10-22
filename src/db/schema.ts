import { pgTable, text, timestamp, integer, primaryKey, boolean, numeric, date, jsonb, index } from "drizzle-orm/pg-core";

// ---- Auth.js tables ----
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ---- App tables ----
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("USD"),
    cycle: text("cycle").notNull().default("monthly"),
    nextRenewal: date("next_renewal"),
    category: text("category").notNull().default("Other"),
    cancelUrl: text("cancel_url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("active"),
    archived: boolean("archived").notNull().default(false),
    snoozedUntil: date("snoozed_until"),
    remindEmail: boolean("remind_email").notNull().default(false),
    lastReminderKey: text("last_reminder_key"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("subs_user_idx").on(t.userId)],
);

export const shares = pgTable("shares", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Subscription report"),
  // Snapshot of exactly the fields/rows the user chose to share.
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const cancelCatalog = pgTable("cancel_catalog", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  url: text("url").notNull(),
  steps: jsonb("steps").notNull(),
});
