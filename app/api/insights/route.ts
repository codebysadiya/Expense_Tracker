import { NextRequest } from "next/server";
import { generateInsights, getMonthlyExpenses } from "@/utils/analysis";
import { getAnomalyInsights } from "@/utils/anomaly";
import { getRecommendations } from "@/utils/recommendations";
import { predictEndOfMonthSpending, predictNextMonthSpending } from "@/utils/predictions";

export async function POST(request: NextRequest) {
  try {
    const { expenses, budgetAmount } = await request.json();

    if (!expenses || !Array.isArray(expenses)) {
      return Response.json({ error: "expenses array is required" }, { status: 400 });
    }

    const insights = [
      ...getAnomalyInsights(expenses),
      ...generateInsights(expenses),
      ...getRecommendations(expenses, budgetAmount),
    ];

    const prediction = predictEndOfMonthSpending(expenses);
    const monthly = getMonthlyExpenses(expenses);
    const nextMonthPrediction = predictNextMonthSpending(monthly);

    return Response.json({ insights, prediction, nextMonthPrediction });
  } catch (err) {
    console.error("POST /api/insights error:", err);
    return Response.json({ error: "Failed to generate insights" }, { status: 500 });
  }
}
