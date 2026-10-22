import { CATALOG } from "./catalog";
import type { Cycle } from "./types";

export type Suggestion = {
  name: string;
  amount: number | null;
  currency: string;
  cycle: Cycle;
  nextRenewal: string | null;
  category: string;
  source: string; // the line it came from, shown to the user for verification
};

const CUR_SYMBOL: Record<string, string> = { $: "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR" };
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function findDate(line: string): string | null {
  let m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? "20" + m[3] : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  m = line.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/i);
  if (m) {
    const mo = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    const y = m[3] ?? String(new Date().getFullYear());
    return `${y}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

function findAmount(line: string): { amount: number; currency: string } | null {
  // $12.99, 12.99 USD, USD 12.99, €9,99, CA$5
  const re = /(?:(CA\$|C\$|A\$|US\$|[$€£¥₹])\s?(\d{1,6}(?:[.,]\d{2})?))|(?:(\d{1,6}[.,]\d{2})\s?(USD|CAD|EUR|GBP|AUD|INR|JPY))|(?:(USD|CAD|EUR|GBP|AUD|INR|JPY)\s?(\d{1,6}(?:[.,]\d{2})?))/i;
  const m = line.match(re);
  if (!m) return null;
  let cur = "USD";
  let raw = "";
  if (m[1]) {
    raw = m[2];
    const sym = m[1].toUpperCase();
    cur = sym === "CA$" || sym === "C$" ? "CAD" : sym === "A$" ? "AUD" : sym === "US$" ? "USD" : CUR_SYMBOL[m[1]] ?? "USD";
  } else if (m[3]) {
    raw = m[3];
    cur = m[4].toUpperCase();
  } else {
    raw = m[6];
    cur = m[5].toUpperCase();
  }
  const amount = parseFloat(raw.replace(",", "."));
  return Number.isFinite(amount) ? { amount, currency: cur } : null;
}

function cleanName(line: string): string {
  return line
    .replace(/(CA\$|C\$|A\$|US\$|[$€£¥₹])\s?\d[\d.,]*/g, "")
    .replace(/\b\d[\d.,]*\s?(USD|CAD|EUR|GBP|AUD|INR|JPY)\b/gi, "")
    .replace(/\b(USD|CAD|EUR|GBP|AUD|INR|JPY)\s?\d[\d.,]*/gi, "")
    .replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, "")
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(,?\s+\d{4})?/gi, "")
    .replace(/\b(monthly|annual(ly)?|yearly|per month|per year|\/mo|\/yr|subscription|recurring|payment|charge|debit|purchase|renews?( on)?)\b/gi, "")
    .replace(/[*#|\-–—:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Pure regex extraction. Every result is a suggestion only — the UI requires user confirmation. */
export function parseStatement(text: string): Suggestion[] {
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 3) continue;
    const amt = findAmount(line);
    const lower = line.toLowerCase();
    const known = CATALOG.find((c) => c.match.some((k) => lower.includes(k)));
    if (!amt && !known) continue;
    const name = known?.name ?? cleanName(line);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const cycle: Cycle = /\b(annual|yearly|per year|\/yr|\/year|12 months)\b/i.test(line) ? "annual" : "monthly";
    out.push({
      name,
      amount: amt?.amount ?? null,
      currency: amt?.currency ?? "USD",
      cycle,
      nextRenewal: findDate(line),
      category: known?.category ?? "Other",
      source: line.slice(0, 200),
    });
  }
  return out.slice(0, 50);
}
