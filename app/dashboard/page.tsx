"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getExpenses, getBudget, getSavingsGoals, getDebts } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Expense, SavingsGoal, Debt } from "@/lib/types";
import {
  getTotalExpenses,
  getExpensesByCategory,
  getCurrentMonthExpenses,
  getLastMonthExpenses,
  getMonthlyExpenses,
} from "@/utils/analysis";
import { predictEndOfMonthSpending } from "@/utils/predictions";
import StatCard from "@/components/StatCard";
import BudgetProgress from "@/components/BudgetProgress";
import ExportMenu from "@/components/ExportMenu";
import { exportExpensesToExcel, exportExpensesToPDF, exportFullReportExcel, exportFullReportPDF } from "@/utils/export";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudgetAmount] = useState<number | null>(null);
  const [budgetObj, setBudgetObj] = useState<{ id: string; userId: string; amount: number; month: string } | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [exps, bud, goals, dts] = await Promise.all([
        getExpenses(user.uid),
        getBudget(user.uid, format(new Date(), "yyyy-MM")),
        getSavingsGoals(user.uid),
        getDebts(user.uid),
      ]);
      setExpenses(exps);
      setBudgetAmount(bud?.amount ?? null);
      setBudgetObj(bud);
      setSavingsGoals(goals);
      setDebts(dts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => { loadData(); }, [loadData]);

  useDataRefresh(loadData);

  if (authLoading || !user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load dashboard</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const currentMonth = getCurrentMonthExpenses(expenses);
  const lastMonth = getLastMonthExpenses(expenses);
  const currentTotal = getTotalExpenses(currentMonth);
  const lastTotal = getTotalExpenses(lastMonth);
  const byCategory = getExpensesByCategory(currentMonth);
  const prediction = predictEndOfMonthSpending(expenses);

  const categoryData = Object.entries(byCategory).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100,
  }));

  const monthlyTotals = getMonthlyExpenses(expenses);
  const trendData = Object.entries(monthlyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([month, total]) => ({
      month: format(new Date(month + "-01"), "MMM yy"),
      total: Math.round(total * 100) / 100,
    }));

  const recentExpenses = currentMonth.slice(0, 5);

  const hasLastMonth = lastMonth.length > 0;
  const changeText =
    hasLastMonth && lastTotal > 0
      ? `${currentTotal > lastTotal ? "+" : ""}${Math.round(((currentTotal - lastTotal) / lastTotal) * 100)}% vs last month`
      : undefined;

  const isNewUser = expenses.length === 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <ExportMenu
          onExportExcel={() => exportExpensesToExcel(expenses)}
          onExportPDF={() => exportExpensesToPDF(expenses)}
          onExportFullExcel={() => exportFullReportExcel(expenses, budgetObj, savingsGoals, debts)}
          onExportFullPDF={() => exportFullReportPDF(expenses, budgetObj, savingsGoals, debts)}
        />
      </div>

      {isNewUser && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-1">Welcome to ExpenseAI!</h2>
          <p className="text-sm text-indigo-700">
            Get started by adding your first expense on the{" "}
            <a href="/expenses" className="font-medium underline">Expenses</a> page,
            then set a monthly budget on the{" "}
            <a href="/budget" className="font-medium underline">Budget</a> page.
          </p>
        </div>
      )}

      {budget && !isNewUser && (
        <div className="mb-6">
          <BudgetProgress spent={currentTotal} budget={budget} showAlert />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="This Month"
          value={`$${currentTotal.toFixed(2)}`}
          subtext={changeText}
          subtextColor={changeText ? (currentTotal > lastTotal ? "text-red-500" : "text-green-500") : undefined}
        />
        <StatCard
          label="Last Month"
          value={hasLastMonth ? `$${lastTotal.toFixed(2)}` : "—"}
          subtext={!hasLastMonth ? "No data yet" : undefined}
        />
        <StatCard
          label="Predicted End of Month"
          value={currentMonth.length > 0 ? `$${prediction.predicted.toFixed(2)}` : "—"}
          subtext={currentMonth.length > 0 ? `$${prediction.dailyAverage.toFixed(2)}/day avg` : "Add expenses to predict"}
        />
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Budget</p>
          {budget ? (
            <>
              <p className="text-2xl font-bold text-gray-900">${budget.toFixed(2)}</p>
              <BudgetProgress spent={currentTotal} budget={budget} />
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-1">No budget set</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h2>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">No expenses this month</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trend</h2>
          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: "#6366f1", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">Need at least 2 months of data for trends</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Totals</h2>
        {categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm">No expenses this month</p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Expenses</h2>
        {recentExpenses.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {recentExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-500">
                    {e.category} &middot; {new Date(e.date).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">${e.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">No expenses yet</p>
        )}
      </div>
    </div>
  );
}
