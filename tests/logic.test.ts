import assert from "node:assert/strict";
import { test } from "node:test";
import { computeTotals, effectiveRenewal, categoryBreakdown } from "../src/lib/calc";
import { parseStatement } from "../src/lib/parse";
import { encodeShare, decodeShare } from "../src/lib/share";
import { findCatalog, CATALOG } from "../src/lib/catalog";
import type { Subscription } from "../src/lib/types";

const base = { cancelUrl: "", notes: "", archived: false, snoozedUntil: null, remindEmail: false, createdAt: "", status: "active" as const, category: "Other", currency: "USD" };
const s = (o: Partial<Subscription>): Subscription => ({ ...base, id: Math.random().toString(), name: "x", amount: 10, cycle: "monthly", nextRenewal: null, ...o });

test("totals: monthly/annual, missing amounts excluded, canceled excluded, per currency", () => {
  const t = computeTotals([
    s({ amount: 10, cycle: "monthly", nextRenewal: "2026-10-25" }),
    s({ amount: 120, cycle: "annual", nextRenewal: "2027-03-01" }),
    s({ amount: null }),
    s({ amount: 99, status: "canceled" }),
    s({ amount: 5, currency: "EUR" }),
  ], "2026-10-21");
  const usd = t.byCurrency.find((c) => c.currency === "USD")!;
  assert.equal(usd.monthly, 20);
  assert.equal(usd.annual, 240);
  assert.equal(usd.next30, 10);
  assert.equal(t.missingAmount, 1);
  assert.equal(t.byCurrency.find((c) => c.currency === "EUR")!.monthly, 5);
  assert.equal(t.upcoming.length, 1);
  assert.equal(t.upcoming[0].days, 4);
});

test("effective renewal rolls past dates forward", () => {
  assert.equal(effectiveRenewal({ nextRenewal: "2026-09-15", cycle: "monthly" }, "2026-10-21"), "2026-11-15");
  assert.equal(effectiveRenewal({ nextRenewal: "2025-01-01", cycle: "annual" }, "2026-10-21"), "2027-01-01");
  assert.equal(effectiveRenewal({ nextRenewal: null, cycle: "annual" }), null);
});

test("category breakdown", () => {
  const b = categoryBreakdown([s({ category: "Streaming", amount: 10 }), s({ category: "Streaming", amount: 24, cycle: "annual" }), s({ category: "Cloud", amount: 3 })], "USD");
  assert.deepEqual(b, [{ category: "Streaming", monthly: 12 }, { category: "Cloud", monthly: 3 }]);
});

test("regex parsing finds services, amounts, dates; never invents amounts", () => {
  const r = parseStatement("NETFLIX.COM 866-579-7172  $15.49  10/03/2026\nSpotify USA 11.99 USD\nAdobe annual $239.88 renews Jan 12, 2027\nPeloton membership\nGROCERY STORE");
  const by = Object.fromEntries(r.map((x) => [x.name, x]));
  assert.equal(by["Netflix"].amount, 15.49);
  assert.equal(by["Netflix"].nextRenewal, "2026-10-03");
  assert.equal(by["Spotify"].amount, 11.99);
  assert.equal(by["Adobe Creative Cloud"].cycle, "annual");
  assert.equal(by["Adobe Creative Cloud"].nextRenewal, "2027-01-12");
  assert.equal(by["Peloton"].amount, null);
  assert.ok(!r.some((x) => /grocery/i.test(x.name)));
});

test("share encode/decode roundtrip incl. unicode", () => {
  const d = { title: "Mes abonnements €", createdAt: "2026-10-21T00:00:00Z", items: [{ name: "Ñetflix", amount: null, currency: "EUR", cycle: "monthly" as const, nextRenewal: null, category: "Streaming", status: "active" }] };
  assert.deepEqual(decodeShare(encodeShare(d)), d);
  assert.equal(decodeShare("garbage"), null);
});

test("catalog lookups and URLs are https", () => {
  assert.equal(findCatalog("Netflix Premium")?.slug, "netflix");
  assert.equal(findCatalog("Disney+")?.slug, "disney-plus");
  assert.equal(findCatalog("My local gym"), undefined);
  for (const c of CATALOG) assert.match(c.url, /^https:\/\//);
});
