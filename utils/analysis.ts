import { Expense, Insight } from "@/lib/types";
import { isWeekend, format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getExpensesByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
}

export function getMonthlyExpenses(expenses: Expense[]): Record<string, number> {
  return expenses.reduce((acc, e) => {
    const month = format(new Date(e.date), "yyyy-MM");
    acc[month] = (acc[month] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
}

export function getDailyExpenses(expenses: Expense[]): Record<string, number> {
  return expenses.reduce((acc, e) => {
    const day = format(new Date(e.date), "yyyy-MM-dd");
    acc[day] = (acc[day] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
}

export function getWeekdayVsWeekend(expenses: Expense[]): { weekday: number; weekend: number } {
  return expenses.reduce(
    (acc, e) => {
      if (isWeekend(new Date(e.date))) {
        acc.weekend += e.amount;
      } else {
        acc.weekday += e.amount;
      }
      return acc;
    },
    { weekday: 0, weekend: 0 }
  );
}

export function getMostFrequentCategory(expenses: Expense[]): string | null {
  const counts: Record<string, number> = {};
  for (const e of expenses) {
    counts[e.category] = (counts[e.category] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

export function getCurrentMonthExpenses(expenses: Expense[]): Expense[] {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export function getLastMonthExpenses(expenses: Expense[]): Expense[] {
  const lastMonth = subMonths(new Date(), 1);
  const start = startOfMonth(lastMonth);
  const end = endOfMonth(lastMonth);
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export function generateInsights(expenses: Expense[]): Insight[] {
  const insights: Insight[] = [];
  if (expenses.length === 0) return insights;

  // Weekend vs weekday spending
  const { weekday, weekend } = getWeekdayVsWeekend(expenses);
  const weekdayDays = expenses.filter((e) => !isWeekend(new Date(e.date))).length || 1;
  const weekendDays = expenses.filter((e) => isWeekend(new Date(e.date))).length || 1;
  const avgWeekday = weekday / weekdayDays;
  const avgWeekend = weekend / weekendDays;

  if (avgWeekend > avgWeekday * 1.3) {
    insights.push({
      type: "info",
      message: `You spend ${Math.round(((avgWeekend - avgWeekday) / avgWeekday) * 100)}% more per transaction on weekends.`,
    });
  }

  // Category trend comparison (current vs last month)
  const currentMonth = getCurrentMonthExpenses(expenses);
  const lastMonth = getLastMonthExpenses(expenses);
  const currentByCategory = getExpensesByCategory(currentMonth);
  const lastByCategory = getExpensesByCategory(lastMonth);

  for (const [cat, amount] of Object.entries(currentByCategory)) {
    const lastAmount = lastByCategory[cat] || 0;
    if (lastAmount > 0 && amount > lastAmount * 1.2) {
      insights.push({
        type: "warning",
        message: `${cat} expenses are increasing — up ${Math.round(((amount - lastAmount) / lastAmount) * 100)}% from last month.`,
        category: cat,
      });
    }
  }

  // Most frequent category
  const topCategory = getMostFrequentCategory(currentMonth);
  if (topCategory) {
    insights.push({
      type: "info",
      message: `Your most frequent expense category this month is ${topCategory}.`,
      category: topCategory,
    });
  }

  return insights;
}
