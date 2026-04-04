import { Expense, Insight } from "@/lib/types";
import { getExpensesByCategory, getCurrentMonthExpenses, getLastMonthExpenses } from "./analysis";

export function getRecommendations(expenses: Expense[], budgetAmount?: number): Insight[] {
  const recommendations: Insight[] = [];
  if (expenses.length === 0) return recommendations;

  const currentMonth = getCurrentMonthExpenses(expenses);
  const lastMonth = getLastMonthExpenses(expenses);
  const currentByCategory = getExpensesByCategory(currentMonth);
  const lastByCategory = getExpensesByCategory(lastMonth);

  // Find category with highest absolute increase
  let maxIncrease = 0;
  let maxCategory = "";
  for (const [cat, amount] of Object.entries(currentByCategory)) {
    const lastAmount = lastByCategory[cat] || 0;
    const increase = amount - lastAmount;
    if (increase > maxIncrease) {
      maxIncrease = increase;
      maxCategory = cat;
    }
  }

  if (maxCategory && maxIncrease > 0) {
    recommendations.push({
      type: "warning",
      message: `Consider reducing spending in ${maxCategory} — it increased by $${maxIncrease.toFixed(2)} compared to last month.`,
      category: maxCategory,
    });
  }

  // Find highest spending category
  const sorted = Object.entries(currentByCategory).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) {
    const [topCat, topAmount] = sorted[0];
    const total = Object.values(currentByCategory).reduce((a, b) => a + b, 0);
    const pct = Math.round((topAmount / total) * 100);
    if (pct > 40) {
      recommendations.push({
        type: "info",
        message: `${topCat} accounts for ${pct}% of your spending this month. Try to diversify or set a sub-budget.`,
        category: topCat,
      });
    }
  }

  // Budget-based recommendation
  if (budgetAmount && budgetAmount > 0) {
    const totalCurrent = Object.values(currentByCategory).reduce((a, b) => a + b, 0);
    const remaining = budgetAmount - totalCurrent;
    const now = new Date();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    if (remaining > 0 && daysLeft > 0) {
      const dailyBudget = remaining / daysLeft;
      recommendations.push({
        type: "success",
        message: `You can spend up to $${dailyBudget.toFixed(2)}/day for the rest of the month to stay within budget.`,
      });
    }
  }

  return recommendations;
}
