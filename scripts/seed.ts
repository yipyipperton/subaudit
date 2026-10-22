import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { cancelCatalog } from "../src/db/schema";
import { CATALOG } from "../src/lib/catalog";

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.log("No DATABASE_URL — catalog is bundled in code; nothing to seed.");
    return;
  }
  const db = drizzle(neon(url));
  for (const c of CATALOG) {
    await db
      .insert(cancelCatalog)
      .values({ slug: c.slug, name: c.name, category: c.category, url: c.url, steps: c.steps })
      .onConflictDoUpdate({ target: cancelCatalog.slug, set: { name: c.name, category: c.category, url: c.url, steps: c.steps } });
  }
  console.log(`Seeded ${CATALOG.length} cancel catalog entries.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
