import { Expense } from "@/lib/types";
import { getDaysInMonth, getDate } from "date-fns";
import { getCurrentMonthExpenses, getTotalExpenses } from "./analysis";

/**
 * Predicts end-of-month total spending using a simple linear projection
 * based on current spending rate (daily average * days in month).
 */
export function predictEndOfMonthSpending(expenses: Expense[]): {
  predicted: number;
  currentTotal: number;
  daysElapsed: number;
  daysInMonth: number;
  dailyAverage: number;
} {
  const now = new Date();
  const currentMonthExpenses = getCurrentMonthExpenses(expenses);
  const currentTotal = getTotalExpenses(currentMonthExpenses);
  const daysElapsed = getDate(now);
  const daysInMonth = getDaysInMonth(now);
  const dailyAverage = daysElapsed > 0 ? currentTotal / daysElapsed : 0;
  const predicted = dailyAverage * daysInMonth;

  return {
    predicted: Math.round(predicted * 100) / 100,
    currentTotal: Math.round(currentTotal * 100) / 100,
    daysElapsed,
    daysInMonth,
    dailyAverage: Math.round(dailyAverage * 100) / 100,
  };
}

/**
 * Simple linear regression on monthly totals to predict next month's spending.
 */
export function predictNextMonthSpending(monthlyTotals: Record<string, number>): number | null {
  const entries = Object.entries(monthlyTotals).sort((a, b) => a[0].localeCompare(b[0]));
  if (entries.length < 2) return null;

  const n = entries.length;
  const xs = entries.map((_, i) => i);
  const ys = entries.map(([, v]) => v);

  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return Math.round((slope * n + intercept) * 100) / 100;
}
