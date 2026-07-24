"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, startTransition } from "react";
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
import BudgetProgress from "@/components/BudgetProgress";
import ExportMenu from "@/components/ExportMenu";
import { exportExpensesToExcel, exportExpensesToPDF, exportFullReportExcel, exportFullReportPDF } from "@/utils/export";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
      startTransition(() => {
        setExpenses(exps);
        setBudgetAmount(bud?.amount ?? null);
        setBudgetObj(bud);
        setSavingsGoals(goals);
        setDebts(dts);
        setLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
        setLoading(false);
      });
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

  return (
  <div className="relative min-h-screen bg-black text-white overflow-hidden px-4 sm:px-6 lg:px-8 py-8">

    {/* MULTI-LAYER GLOW */}
    <div className="absolute w-[700px] h-[700px] bg-purple-500/20 blur-[140px] rounded-full -top-40 -left-40 animate-pulse"></div>
    <div className="absolute w-[600px] h-[600px] bg-emerald-400/20 blur-[140px] rounded-full bottom-0 right-0 animate-pulse"></div>
    <div className="absolute w-[500px] h-[500px] bg-pink-500/10 blur-[120px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

    {/* FLOATING GRID LINES (pro effect) */}
    <div className="absolute inset-0 opacity-[0.04] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:60px_60px]"></div>

    <div className="relative z-10 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-emerald-400 via-teal-300 to-purple-400 bg-clip-text text-transparent animate-gradient-x">
          Financial Dashboard
        </h1>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-sm text-gray-300">
            {new Date().toDateString()}
          </div>
          <ExportMenu
            onExportExcel={() => exportExpensesToExcel(expenses)}
            onExportPDF={() => exportExpensesToPDF(expenses)}
            onExportFullExcel={() => exportFullReportExcel(expenses, budgetObj, savingsGoals, debts)}
            onExportFullPDF={() => exportFullReportPDF(expenses, budgetObj, savingsGoals, debts)}
          />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">

        {[ 
          {
            label: "This Month",
            value: `$${currentTotal.toFixed(2)}`,
            sub: changeText
          },
          {
            label: "Last Month",
            value: hasLastMonth ? `$${lastTotal.toFixed(2)}` : "—",
            sub: !hasLastMonth ? "No data" : ""
          },
          {
            label: "Prediction",
            value: currentMonth.length ? `$${prediction.predicted.toFixed(2)}` : "—",
            sub: currentMonth.length ? `${prediction.dailyAverage.toFixed(2)}/day` : ""
          }
        ].map((card, i) => (
          <div
            key={i}
            className="group bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:scale-[1.03] hover:border-emerald-400/30 transition duration-300 shadow-lg"
          >
            <p className="text-sm text-gray-400 mb-1">{card.label}</p>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs mt-1 text-gray-400">{card.sub}</p>
          </div>
        ))}

        {/* Budget Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl hover:scale-[1.03] transition shadow-lg">
          <p className="text-sm text-gray-400">Budget</p>
          {budget ? (
            <>
              <p className="text-2xl font-bold text-white">${budget.toFixed(2)}</p>
              <BudgetProgress spent={currentTotal} budget={budget} />
            </>
          ) : (
            <p className="text-gray-400 text-sm">No budget</p>
          )}
        </div>

      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-lg hover:shadow-emerald-500/10 transition">
          <h2 className="text-lg font-semibold mb-4 text-white">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}   
                label={({  percent }) =>
                  `(${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-black/80 border border-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
                        <p className="text-gray-400 text-xs">{data.name}</p>
                        <p className="text-emerald-400 font-semibold">
                          ${Number(data.value).toFixed(2)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-gray-300">{value}</span>}
            />

            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-lg hover:shadow-purple-500/10 transition">
          <h2 className="text-lg font-semibold mb-4 text-white">Monthly Trend</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={trendData}>

              <XAxis dataKey="month" stroke="#aaa" />
              <YAxis stroke="#aaa" />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-black/80 border border-white/10 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg">
                        <p className="text-gray-400 text-xs">{data.payload.month}</p>
                        <p className="text-emerald-400 font-semibold">
                          ${Number(data.value).toFixed(2)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill={COLORS[0]} />

            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* RECENT */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-white">Recent Expenses</h2>

        {recentExpenses.map((e) => (
          <div key={e.id} className="flex justify-between py-3 border-b border-white/10 last:border-none">
            <div>
              <p className="text-white font-medium">{e.description}</p>
              <p className="text-gray-400 text-xs">
                {e.category} • {new Date(e.date).toLocaleDateString()}
              </p>
            </div>
            <p className="text-emerald-400 font-semibold">${e.amount.toFixed(2)}</p>
          </div>
        ))}
      </div>

    </div>

    {/* ANIMATION */}
    <style jsx>{`
      @keyframes gradient-x {
        0%,100% { background-size: 200% 200%; background-position: left center; }
        50% { background-position: right center; }
      }
      .animate-gradient-x {
        animation: gradient-x 6s ease infinite;
      }
    `}</style>

  </div>
);
}