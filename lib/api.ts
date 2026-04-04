import { Expense } from "./types";

// --- Insights (server-side computation) ---

export async function fetchInsights(
  expenses: Expense[],
  budgetAmount?: number
): Promise<{
  insights: { type: string; message: string; category?: string }[];
  prediction: { predicted: number; dailyAverage: number; currentTotal: number; daysElapsed: number; daysInMonth: number };
  nextMonthPrediction: number | null;
}> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expenses, budgetAmount }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "Failed to generate insights");
  }
  return res.json();
}
