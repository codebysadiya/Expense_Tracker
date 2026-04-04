import { Expense, Insight } from "@/lib/types";

/**
 * Detects anomalies using a simple z-score approach.
 * An expense is flagged if its amount is more than 2 standard deviations
 * above the mean for its category.
 */
export function detectAnomalies(expenses: Expense[]): Expense[] {
  const byCategory: Record<string, number[]> = {};
  for (const e of expenses) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e.amount);
  }

  const stats: Record<string, { mean: number; std: number }> = {};
  for (const [cat, amounts] of Object.entries(byCategory)) {
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((acc, a) => acc + (a - mean) ** 2, 0) / amounts.length;
    stats[cat] = { mean, std: Math.sqrt(variance) };
  }

  return expenses.filter((e) => {
    const { mean, std } = stats[e.category];
    if (std === 0) return false;
    const zScore = (e.amount - mean) / std;
    return zScore > 2;
  });
}

export function getAnomalyInsights(expenses: Expense[]): Insight[] {
  const anomalies = detectAnomalies(expenses);
  return anomalies.map((e) => ({
    type: "anomaly" as const,
    message: `Unusually high ${e.category} expense of $${e.amount.toFixed(2)} on ${new Date(e.date).toLocaleDateString()} — "${e.description}"`,
    category: e.category,
  }));
}
