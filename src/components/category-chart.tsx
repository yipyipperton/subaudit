"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMoney } from "@/lib/calc";

export function CategoryChart({ data, currency }: { data: { category: string; monthly: number }[]; currency: string }) {
  if (!data.length) return <p className="py-8 text-center text-sm text-muted-foreground">Add costs to see a breakdown by category.</p>;
  return (
    <div style={{ height: Math.max(120, data.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="category" width={80} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} />
          <Tooltip cursor={{ fill: "var(--muted)" }} formatter={(v) => [fmtMoney(Number(v), currency) + " / mo", "Monthly"]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--popover-foreground)" }} />
          <Bar dataKey="monthly" fill="oklch(0.62 0.13 250)" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
