import type { Subscription } from "./types";
import { todayISO } from "./calc";

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

// SAMPLE DATA for the demo only. Prices are illustrative placeholders, not current list prices.
export function demoSubs(): Subscription[] {
  const base = { cancelUrl: "", notes: "", archived: false, snoozedUntil: null, remindEmail: false, createdAt: new Date().toISOString() };
  return [
    { ...base, id: "demo-1", name: "Netflix", amount: 15.49, currency: "USD", cycle: "monthly", nextRenewal: inDays(3), category: "Streaming", status: "active" },
    { ...base, id: "demo-2", name: "Spotify", amount: 11.99, currency: "USD", cycle: "monthly", nextRenewal: inDays(12), category: "Streaming", status: "keeping" },
    { ...base, id: "demo-3", name: "Adobe Creative Cloud", amount: 59.99, currency: "USD", cycle: "monthly", nextRenewal: inDays(6), category: "Software", status: "reviewing", notes: "Only used twice this quarter" },
    { ...base, id: "demo-4", name: "Dropbox", amount: 119.88, currency: "USD", cycle: "annual", nextRenewal: inDays(25), category: "Cloud", status: "active" },
    { ...base, id: "demo-5", name: "Peloton", amount: 44, currency: "USD", cycle: "monthly", nextRenewal: inDays(40), category: "Fitness", status: "canceling" },
    { ...base, id: "demo-6", name: "The New York Times", amount: null, currency: "USD", cycle: "monthly", nextRenewal: null, category: "News", status: "active", notes: "Promo rate — check the actual amount" },
  ];
}
