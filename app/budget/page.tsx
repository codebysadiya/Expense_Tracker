"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getBudget, setBudget, getExpenses, getAllBudgets } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Expense, Budget } from "@/lib/types";
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
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
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
      const [bud, exps, buds] = await Promise.all([
        getBudget(user.uid, selectedMonth),
        getExpenses(user.uid),
        getAllBudgets(user.uid),
      ]);
      setBudgetAmount(bud?.amount ?? null);
      setInputAmount(bud?.amount?.toString() ?? "");
      setExpenses(exps);
      setAllBudgets(buds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budget data");
    } finally {
      setLoading(false);
    }
  }, [user, selectedMonth]);

  const monthOverBudget = useMemo(() => {
    const spent: Record<string, number> = {};
    for (const e of expenses) {
      const m = e.date.slice(0, 7);
      spent[m] = (spent[m] || 0) + e.amount;
    }
    const map: Record<string, boolean> = {};
    for (const b of allBudgets) {
      map[b.month] = (spent[b.month] || 0) > b.amount;
    }
    return map;
  }, [expenses, allBudgets]);

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
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

    {/* HEADER */}
    <h1 className="text-3xl font-bold mb-8 bg-gradient-to-r from-emerald-400 to-purple-400 text-transparent bg-clip-text">
      Budget
    </h1>

    <div className="flex flex-col md:flex-row gap-6">

      {/* SIDEBAR */}
      <div className="md:w-56 shrink-0">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-lg overflow-hidden">

          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Months
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">

            {months.map((m) => {
              const over = monthOverBudget[m];

              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  title={over ? "Over budget this month" : undefined}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition ${
                    m === selectedMonth
                      ? "bg-white/10 text-white border-l-2 border-emerald-400"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <span>{format(new Date(m + "-01"), "MMM yyyy")}</span>

                  {over && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                      Over
                    </span>
                  )}
                </button>
              );
            })}

          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 min-w-0">

        {loading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-gray-400">Loading budget...</div>
          </div>
        ) : (
          <>

            {/* MONTH TITLE */}
            <h2 className="text-xl font-semibold text-white mb-5">
              {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
            </h2>

            {/* BUDGET CARD */}
            <form
              onSubmit={handleSave}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 mb-6 shadow-lg"
            >
              <h3 className="text-base font-semibold text-white mb-4">
                Monthly Budget
              </h3>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-1">
                    Amount ($)
                  </label>

                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="e.g. 2000"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-emerald-400 to-purple-500 text-black px-5 py-2 rounded-lg font-semibold hover:scale-105 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : budgetAmount ? "Update" : "Set Budget"}
                </button>
              </div>
            </form>

            {/* PROGRESS CARD */}
            {budgetAmount ? (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 mb-6 shadow-lg">

                <h3 className="text-base font-semibold text-white mb-4">
                  Progress
                </h3>

                <BudgetProgress
                  spent={totalSpent}
                  budget={budgetAmount}
                  showAlert={isCurrentMonth}
                />

                <div className="flex justify-between text-sm text-gray-400 mt-4 mb-3">
                  <span>Spent: ${totalSpent.toFixed(2)}</span>
                  <span>Budget: ${budgetAmount.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-4">

                  <div>
                    <p className="text-2xl font-bold text-white">
                      {Math.min((totalSpent / budgetAmount) * 100, 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-400">Used</p>
                  </div>

                  <div>
                    <p className={`text-2xl font-bold ${remaining! >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${Math.abs(remaining!).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {remaining! >= 0 ? "Remaining" : "Over budget"}
                    </p>
                  </div>

                  <div>
                    {isCurrentMonth ? (
                      <>
                        <p className="text-2xl font-bold text-white">
                          {dailyBudget ? `$${dailyBudget.toFixed(2)}` : "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          /day for {daysLeft} days left
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-white">
                          {monthExpenses.length}
                        </p>
                        <p className="text-xs text-gray-400">Transactions</p>
                      </>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 mb-6 text-center text-gray-400">
                No budget set for this month. Set one above to track your spending.
              </div>
            )}

            {/* CATEGORY BREAKDOWN */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg">

              <h3 className="text-base font-semibold text-white mb-4">
                Spending by Category
              </h3>

              {sortedCategories.length > 0 ? (
                <div className="space-y-4">

                  {sortedCategories.map(([cat, amount]) => {
                    const catPct = budgetAmount ? (amount / budgetAmount) * 100 : 0;

                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">{cat}</span>
                          <span className="text-gray-400">${amount.toFixed(2)}</span>
                        </div>

                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-purple-500 rounded-full"
                            style={{ width: `${Math.min(catPct, 100)}%` }}
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