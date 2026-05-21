"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getBudget, setBudget, getExpenses } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Expense } from "@/lib/types";
import { getTotalExpenses, getExpensesByCategory } from "@/utils/analysis";
import BudgetProgress from "@/components/BudgetProgress";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

function generateMonthList(count: number): string[] {
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(format(subMonths(new Date(), i), "yyyy-MM"));
  }
  return months;
}

function getMonthExpenses(expenses: Expense[], month: string): Expense[] {
  const start = startOfMonth(new Date(month + "-01"));
  const end = endOfMonth(new Date(month + "-01"));
  return expenses.filter((e) => {
    const d = new Date(e.date);
    return d >= start && d <= end;
  });
}

export default function BudgetPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [budgetAmount, setBudgetAmount] = useState<number | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const months = generateMonthList(12);
  const isCurrentMonth = selectedMonth === format(new Date(), "yyyy-MM");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [bud, exps] = await Promise.all([
        getBudget(user.uid, selectedMonth),
        getExpenses(user.uid),
      ]);
      setBudgetAmount(bud?.amount ?? null);
      setInputAmount(bud?.amount?.toString() ?? "");
      setExpenses(exps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth]);

  useEffect(() => { setLoading(true); loadData(); }, [loadData]);

  useDataRefresh(loadData);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const amount = parseFloat(inputAmount);
    await setBudget(user.uid, selectedMonth, amount);
    setBudgetAmount(amount);
    setSaving(false);
  }

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load budget</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  const monthExpenses = getMonthExpenses(expenses, selectedMonth);
  const totalSpent = getTotalExpenses(monthExpenses);
  const byCategory = getExpensesByCategory(monthExpenses);
  const remaining = budgetAmount ? budgetAmount - totalSpent : null;
  const now = new Date();
  const daysLeft = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate()
    : 0;
  const dailyBudget = remaining && remaining > 0 && daysLeft > 0 ? remaining / daysLeft : null;
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    {/* HEADER */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text">
        Budget Planner
      </h1>

      <p className="text-gray-400 mt-2 text-sm">
        Track monthly budgets and control your spending intelligently.
      </p>
    </div>

    <div className="flex flex-col md:flex-row gap-6">

      {/* SIDEBAR */}
      <div className="md:w-56 shrink-0">

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-[0_0_30px_rgba(0,0,0,0.3)] overflow-hidden">

          {/* TITLE */}
          <div className="px-4 py-4 border-b border-white/10 bg-white/5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-[0.2em]">
              Months
            </p>
          </div>

          {/* MONTH LIST */}
          <div className="max-h-[500px] overflow-y-auto">

            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`group relative w-full text-left px-4 py-3 text-sm transition-all duration-300 ${
                  m === selectedMonth
                    ? "bg-white/10 text-white border-l-2 border-emerald-400"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >

                {/* ACTIVE GLOW */}
                {m === selectedMonth && (
                  <div className="absolute inset-0 bg-emerald-400/5 pointer-events-none"></div>
                )}

                <span className="relative z-10">
                  {format(new Date(m + "-01"), "MMM yyyy")}
                </span>

              </button>
            ))}

          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 min-w-0">

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px] backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl">
            <div className="text-gray-400 animate-pulse">
              Loading budget...
            </div>
          </div>
        ) : (
          <>

            {/* MONTH TITLE */}
            <div className="mb-5">
              <h2 className="text-2xl font-semibold text-white">
                {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
              </h2>

              <p className="text-sm text-gray-400 mt-1">
                Financial overview and spending analysis
              </p>
            </div>

            {/* SET BUDGET */}
            <form
              onSubmit={handleSave}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6 mb-6"
            >

              <h3 className="text-lg font-semibold text-white mb-5">
                Monthly Budget
              </h3>

              <div className="flex flex-col sm:flex-row gap-4 items-end">

                <div className="flex-1 w-full">
                  <label className="block text-sm text-gray-300 mb-2">
                    Amount ($)
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    placeholder="e.g. 2000"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-linear-to-r from-emerald-400 to-purple-500 text-black px-6 py-3 rounded-xl text-sm font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 shadow-lg"
                >
                  {saving
                    ? "Saving..."
                    : budgetAmount
                    ? "Update Budget"
                    : "Set Budget"}
                </button>

              </div>
            </form>

            {/* PROGRESS */}
            {budgetAmount ? (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6 mb-6">

                <h3 className="text-lg font-semibold text-white mb-5">
                  Budget Progress
                </h3>

                <BudgetProgress
                  spent={totalSpent}
                  budget={budgetAmount}
                  showAlert={isCurrentMonth}
                />

                <div className="flex justify-between text-sm text-gray-300 mt-5 mb-4">
                  <span>
                    Spent:
                    <span className="text-red-400 font-semibold ml-1">
                      ${totalSpent.toFixed(2)}
                    </span>
                  </span>

                  <span>
                    Budget:
                    <span className="text-emerald-400 font-semibold ml-1">
                      ${budgetAmount.toFixed(2)}
                    </span>
                  </span>
                </div>

                {/* STATS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">

                  {/* USED */}
                  <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 transition">

                    <p className="text-3xl font-bold text-white">
                      {Math.min(
                        (totalSpent / budgetAmount) * 100,
                        100
                      ).toFixed(0)}%
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Used
                    </p>

                  </div>

                  {/* REMAINING */}
                  <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 transition">

                    <p
                      className={`text-3xl font-bold ${
                        remaining! >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      ${Math.abs(remaining!).toFixed(2)}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      {remaining! >= 0
                        ? "Remaining"
                        : "Over Budget"}
                    </p>

                  </div>

                  {/* DAILY */}
                  <div className="backdrop-blur-lg bg-white/5 border border-white/10 rounded-xl p-5 text-center hover:bg-white/10 transition">

                    {isCurrentMonth ? (
                      <>
                        <p className="text-3xl font-bold text-cyan-400">
                          {dailyBudget
                            ? `$${dailyBudget.toFixed(2)}`
                            : "—"}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          /day for {daysLeft} days left
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-purple-400">
                          {monthExpenses.length}
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Transactions
                        </p>
                      </>
                    )}

                  </div>
                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-10 mb-6 text-center">

                <p className="text-gray-400 text-sm">
                  No budget set for this month.
                </p>

                <p className="text-gray-500 text-xs mt-2">
                  Set a monthly target to start tracking spending patterns.
                </p>

              </div>
            )}

            {/* CATEGORY BREAKDOWN */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6">

              <h3 className="text-lg font-semibold text-white mb-5">
                Spending by Category
              </h3>

              {sortedCategories.length > 0 ? (
                <div className="space-y-4">

                  {sortedCategories.map(([cat, amount], index) => {
                    const catPct = budgetAmount
                      ? (amount / budgetAmount) * 100
                      : 0;

                    const colors = [
                      "from-emerald-400 to-green-500",
                      "from-purple-400 to-pink-500",
                      "from-cyan-400 to-blue-500",
                      "from-orange-400 to-red-500",
                      "from-yellow-400 to-orange-500",
                    ];

                    return (
                      <div key={cat}>

                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-gray-200">
                            {cat}
                          </span>

                          <span className="text-gray-400">
                            ${amount.toFixed(2)}
                          </span>
                        </div>

                        <div className="h-3 bg-white/10 rounded-full overflow-hidden">

                          <div
                            className={`h-full rounded-full bg-linear-to-r ${
                              colors[index % colors.length]
                            } shadow-lg`}
                            style={{
                              width: `${Math.min(catPct, 100)}%`,
                            }}
                          />

                        </div>

                      </div>
                    );
                  })}

                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  No expenses for this month
                </p>
              )}
            </div>

          </>
        )}
      </div>
    </div>
  </div>
);
}
