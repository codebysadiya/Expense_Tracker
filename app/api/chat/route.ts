import { NextRequest } from "next/server";
import { parseMessage } from "@/utils/nlp";
import { aiFallback } from "@/utils/ai-fallback";

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message) {
      return Response.json({ error: "message is required" }, { status: 400 });
    }

    const ctx = {
      expenses: context?.expenses || [],
      budgetAmount: context?.budgetAmount,
      savingsGoals: context?.savingsGoals || [],
      debts: context?.debts || [],
    };

    // Step 1: Try local NLP parser (instant, free, no limits)
    const localResult = parseMessage(message, ctx);

    if (localResult.intent !== "unknown") {
      // Local parser understood it — use it
      const actions: Array<{ tool: string; input: Record<string, unknown> }> = [];
      if (localResult.intent !== "query") {
        actions.push({ tool: localResult.intent, input: localResult.params });
      }
      return Response.json({ text: localResult.response, actions, source: "local" });
    }

    // Step 2: Local parser didn't understand — try AI fallback
    const aiResult = await aiFallback(message, ctx);

    const actions: Array<{ tool: string; input: Record<string, unknown> }> = [];
    if (aiResult.intent !== "query" && aiResult.intent !== "unknown") {
      actions.push({ tool: aiResult.intent, input: aiResult.params });
    }

    return Response.json({ text: aiResult.response, actions, source: aiResult.intent !== "unknown" ? "ai" : "none" });
  } catch (err) {
    console.error("POST /api/chat error:", err);
    return Response.json({ error: "Failed to process message" }, { status: 500 });
  }
}
