import { z } from "zod";
import { json, limited } from "@/lib/api";
import { parseStatement, type Suggestion } from "@/lib/parse";
import { features } from "@/lib/config";

const body = z.object({ text: z.string().min(1).max(20_000), ai: z.boolean().default(false) });

const aiItem = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().nonnegative().nullable(),
  currency: z.string().max(8).nullable(),
  cycle: z.enum(["monthly", "annual"]).nullable(),
  nextRenewal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  category: z.string().max(40).nullable(),
  source: z.string().max(300).nullable(),
});

export async function POST(req: Request) {
  const l = limited(req, "parse", 20);
  if (l) return l;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Paste some text (max 20,000 characters)." }, 400);
  const { text, ai } = parsed.data;
  if (!ai || !features.ai) return json({ suggestions: parseStatement(text), method: "regex" });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Extract recurring subscriptions from the user\'s statement or receipt text. Return JSON {"items":[{"name","amount","currency","cycle","nextRenewal","category","source"}]}. Only include values literally present in the text; use null for anything missing. Never guess prices. cycle is "monthly" or "annual" or null. nextRenewal is YYYY-MM-DD or null. category is one of Streaming, Software, Fitness, News, Cloud, Other. source is the line it came from.',
          },
          { role: "user", content: text },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    const items = z.object({ items: z.array(aiItem).max(50) }).parse(JSON.parse(data.choices[0].message.content));
    const suggestions: Suggestion[] = items.items.map((i) => ({
      name: i.name,
      amount: i.amount,
      currency: i.currency || "USD",
      cycle: i.cycle || "monthly",
      nextRenewal: i.nextRenewal,
      category: i.category || "Other",
      source: i.source || "",
    }));
    return json({ suggestions, method: "ai" });
  } catch {
    return json({ suggestions: parseStatement(text), method: "regex", note: "AI extraction failed; showing pattern-matched results instead." });
  }
}
