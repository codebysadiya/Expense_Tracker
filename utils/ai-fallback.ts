import { Expense, Debt, SavingsGoal, CATEGORIES } from "@/lib/types";
import { format } from "date-fns";

interface FinancialContext {
  expenses: Expense[];
  budgetAmount?: number;
  savingsGoals: SavingsGoal[];
  debts: Debt[];
}

interface FallbackResult {
  intent: "add_expense" | "set_budget" | "add_debt" | "add_savings_goal" | "query" | "unknown";
  params: Record<string, unknown>;
  response: string;
}

const HF_API = "https://router.huggingface.co/together/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-7B-Instruct-Turbo";

export async function aiFallback(message: string, ctx: FinancialContext): Promise<FallbackResult> {
  const token = process.env.HF_TOKEN;
  if (!token || token === "your_hf_token") {
    return {
      intent: "unknown",
      params: {},
      response: "I didn't quite understand that. Try rephrasing, or set up a Hugging Face token for smarter responses.\n\nExamples I understand:\n• \"Add $50 for groceries\"\n• \"How much did I spend this month?\"\n• \"Am I over budget?\"",
    };
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const currentMonth = format(new Date(), "yyyy-MM");
  const dataSummary = buildCompactSummary(ctx, currentMonth);

  const systemPrompt = `You are a financial assistant for an expense tracker. Today is ${today}.

USER DATA:
${dataSummary}

RESPOND WITH ONLY VALID JSON (no markdown, no code blocks, no explanation). Use this exact format:

For adding an expense:
{"intent":"add_expense","params":{"amount":50,"category":"Food","description":"coffee","date":"${today}"},"response":"Added $50.00 expense for coffee (Food)."}

For setting budget:
{"intent":"set_budget","params":{"amount":2000,"month":"${currentMonth}"},"response":"Budget set to $2000.00."}

For adding a debt (someone owes user):
{"intent":"add_debt","params":{"type":"owed_to_me","personName":"John","amount":50,"description":"lunch","date":"${today}"},"response":"John owes you $50.00 for lunch."}

For adding a debt (user owes someone):
{"intent":"add_debt","params":{"type":"i_owe","personName":"Sara","amount":30,"description":"tickets","date":"${today}"},"response":"You owe Sara $30.00 for tickets."}

For creating a savings goal:
{"intent":"add_savings_goal","params":{"name":"Vacation","targetAmount":5000,"currentAmount":0,"deadline":"2026-12-31"},"response":"Created savings goal: Vacation ($5000.00)."}

For answering questions about data:
{"intent":"query","params":{},"response":"Your computed answer here."}

If unclear:
{"intent":"unknown","params":{},"response":"I didn't understand. Try rephrasing."}

VALID CATEGORIES: ${CATEGORIES.join(", ")}
ONLY OUTPUT THE JSON OBJECT. NOTHING ELSE.`;

  try {
    const res = await fetch(HF_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("HF API error:", res.status, errText.slice(0, 200));
      return { intent: "unknown", params: {}, response: "AI service temporarily unavailable. Try a simpler phrasing." };
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return { intent: "unknown", params: {}, response: "I couldn't process that. Try rephrasing." };
    }

    // Extract JSON from response (handle potential markdown wrapping)
    let jsonStr = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as FallbackResult;

    // Validate
    const validIntents = ["add_expense", "set_budget", "add_debt", "add_savings_goal", "query", "unknown"];
    if (!validIntents.includes(parsed.intent)) parsed.intent = "unknown";
    if (!parsed.response) parsed.response = "Done.";
    if (!parsed.params) parsed.params = {};

    // Validate expense params
    if (parsed.intent === "add_expense") {
      const p = parsed.params;
      if (!p.amount || typeof p.amount !== "number" || p.amount <= 0) {
        return { intent: "unknown", params: {}, response: "I couldn't determine the amount. Try: \"Add $50 for groceries\"" };
      }
      if (!CATEGORIES.includes(p.category as typeof CATEGORIES[number])) p.category = "Other";
      if (!p.date) p.date = today;
      if (!p.description) p.description = "Expense";
    }

    if (parsed.intent === "set_budget") {
      const p = parsed.params;
      if (!p.amount || typeof p.amount !== "number") {
        return { intent: "unknown", params: {}, response: "I couldn't determine the budget amount." };
      }
      if (!p.month) p.month = currentMonth;
    }

    if (parsed.intent === "add_debt") {
      const p = parsed.params;
      if (!p.amount || !p.personName) {
        return { intent: "unknown", params: {}, response: "I need a person name and amount. Try: \"John owes me $50\"" };
      }
      if (!["owed_to_me", "i_owe"].includes(p.type as string)) p.type = "i_owe";
      if (!p.date) p.date = today;
      if (!p.description) p.description = "Debt";
    }

    return parsed;
  } catch (err) {
    console.error("AI fallback error:", err);
    return {
      intent: "unknown",
      params: {},
      response: "AI fallback couldn't process that. Try:\n• \"Add $50 for groceries\"\n• \"How much did I spend?\"\n• \"Am I over budget?\"",
    };
  }
}

function buildCompactSummary(ctx: FinancialContext, currentMonth: string): string {
  const { expenses, budgetAmount, savingsGoals, debts } = ctx;
  const parts: string[] = [];

  const byMonth: Record<string, { total: number; count: number; cats: Record<string, number> }> = {};
  for (const e of expenses) {
    const m = e.date.slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { total: 0, count: 0, cats: {} };
    byMonth[m].total += e.amount;
    byMonth[m].count++;
    byMonth[m].cats[e.category] = (byMonth[m].cats[e.category] || 0) + e.amount;
  }

  if (Object.keys(byMonth).length > 0) {
    parts.push("Expenses:");
    for (const [m, d] of Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 4)) {
      const cats = Object.entries(d.cats).sort((a, b) => b[1] - a[1]).map(([c, a]) => `${c}:$${a.toFixed(0)}`).join(",");
      parts.push(`${m}: $${d.total.toFixed(2)} (${d.count}txn) [${cats}]`);
    }
  }

  if (budgetAmount) {
    const spent = expenses.filter((e) => e.date.startsWith(currentMonth)).reduce((s, e) => s + e.amount, 0);
    parts.push(`Budget(${currentMonth}): $${budgetAmount}, spent: $${spent.toFixed(2)}`);
  }

  if (savingsGoals.length > 0) {
    parts.push("Savings: " + savingsGoals.map((g) => `${g.name}($${g.currentAmount}/$${g.targetAmount})`).join(","));
  }

  const activeDebts = debts.filter((d) => !d.settled);
  if (activeDebts.length > 0) {
    parts.push("Debts: " + activeDebts.map((d) => `${d.type === "owed_to_me" ? d.personName + "→me" : "me→" + d.personName}:$${d.amount}`).join(","));
  }

  return parts.length > 0 ? parts.join("\n") : "No data yet.";
}
