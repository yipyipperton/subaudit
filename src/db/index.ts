import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const hasDb = Boolean(url);
export const db = url ? drizzle(neon(url), { schema }) : null;
