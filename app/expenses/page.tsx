"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getExpenses, addExpense, updateExpense, deleteExpense, getAllBudgets } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Expense, Budget, CATEGORIES } from "@/lib/types";
import ExpenseForm from "@/components/ExpenseForm";
import ExportMenu from "@/components/ExportMenu";
import AlertModal from "@/components/AlertModal";
import { exportExpensesToExcel, exportExpensesToPDF } from "@/utils/export";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

function generateMonthList(count: number): string[] {
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(format(subMonths(new Date(), i), "yyyy-MM"));
  }
  return months;
}

export default function ExpensesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [overBudgetAlert, setOverBudgetAlert] = useState<{
    monthLabel: string;
    spent: number;
    budget: number;
    overBy: number;
  } | null>(null);

  const months = generateMonthList(12);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [exps, buds] = await Promise.all([getExpenses(user.uid), getAllBudgets(user.uid)]);
      setAllExpenses(exps);
      setBudgets(buds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([getExpenses(user.uid), getAllBudgets(user.uid)])
      .then(([exps, buds]) => { if (!cancelled) { setAllExpenses(exps); setBudgets(buds); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Failed to load expenses"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user]);

  useDataRefresh(loadAll);

  // Map month → { spent, budget } for indicators
  const monthSummary = useMemo(() => {
    const map: Record<string, { spent: number; budget: number | null }> = {};
    for (const e of allExpenses) {
      const m = e.date.slice(0, 7);
      if (!map[m]) map[m] = { spent: 0, budget: null };
      map[m].spent += e.amount;
    }
    for (const b of budgets) {
      if (!map[b.month]) map[b.month] = { spent: 0, budget: b.amount };
      else map[b.month].budget = b.amount;
    }
    return map;
  }, [allExpenses, budgets]);

  function isOverBudget(month: string): boolean {
    const s = monthSummary[month];
    return !!(s && s.budget != null && s.spent > s.budget);
  }

  async function handleSubmit(data: { amount: number; category: string; date: string; description: string }) {
    if (!user) return;
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense({ userId: user.uid, ...data, createdAt: new Date().toISOString() });
    }
    setShowForm(false);
    setEditingExpense(null);

    // Reload then check if the affected month is now over budget
    const [exps, buds] = await Promise.all([getExpenses(user.uid), getAllBudgets(user.uid)]);
    setAllExpenses(exps);
    setBudgets(buds);

    const expenseMonth = data.date.slice(0, 7);
    const budget = buds.find((b) => b.month === expenseMonth);
    if (budget) {
      const start = startOfMonth(new Date(expenseMonth + "-01"));
      const end = endOfMonth(new Date(expenseMonth + "-01"));
      const monthSpent = exps
        .filter((e) => { const d = new Date(e.date); return d >= start && d <= end; })
        .reduce((s, e) => s + e.amount, 0);
      if (monthSpent > budget.amount) {
        setOverBudgetAlert({
          monthLabel: format(start, "MMMM yyyy"),
          spent: monthSpent,
          budget: budget.amount,
          overBy: monthSpent - budget.amount,
        });
      }
    }
  }

  function handleCancel() { setShowForm(false); setEditingExpense(null); }

  async function handleDelete(id: string) {
    await deleteExpense(id);
    await loadAll();
  }

  if (authLoading || !user || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-gray-400">Loading expenses...</div></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load expenses</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  // Filter by month
  let expenses = allExpenses;
  if (selectedMonth !== "all") {
    const start = startOfMonth(new Date(selectedMonth + "-01"));
    const end = endOfMonth(new Date(selectedMonth + "-01"));
    expenses = allExpenses.filter((e) => {
      const d = new Date(e.date);
      return d >= start && d <= end;
    });
  }

  // Filter by category
  const filtered = filterCategory === "All" ? expenses : expenses.filter((e) => e.category === filterCategory);

  // Monthly total
  const monthTotal = filtered.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AlertModal
        open={!!overBudgetAlert}
        variant="danger"
        title="Over budget"
        message={
          overBudgetAlert
            ? `${overBudgetAlert.monthLabel}: you've spent $${overBudgetAlert.spent.toFixed(2)} of your $${overBudgetAlert.budget.toFixed(2)} budget — that's $${overBudgetAlert.overBy.toFixed(2)} over.`
            : ""
        }
        primaryLabel="Got it"
        secondaryLabel="View budget"
        onSecondary={() => router.push("/budget")}
        onClose={() => setOverBudgetAlert(null)}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <div className="flex items-center gap-2">
          <ExportMenu
            onExportExcel={() => exportExpensesToExcel(filtered)}
            onExportPDF={() => exportExpensesToPDF(filtered)}
          />
          <button
            onClick={() => { setEditingExpense(null); setShowForm(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + Add Expense
          </button>
        </div>
      </div>

      {showForm && <ExpenseForm expense={editingExpense} onSubmit={handleSubmit} onCancel={handleCancel} />}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Month sidebar */}
        <div className="md:w-48 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filter by Month</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <button
                onClick={() => setSelectedMonth("all")}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedMonth === "all"
                    ? "bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                All Time
              </button>
              {months.map((m) => {
                const over = isOverBudget(m);
                const active = m === selectedMonth;
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    title={over ? "Over budget this month" : undefined}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-2 ${
                      active
                        ? "bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{format(new Date(m + "-01"), "MMM yyyy")}</span>
                    {over && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Over
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <p className="text-sm text-gray-500">
              {filtered.length} expense{filtered.length !== 1 ? "s" : ""} &middot; <span className="font-semibold text-gray-900">${monthTotal.toFixed(2)}</span>
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
            {filtered.length > 0 ? (
              filtered.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.description}</p>
                    <p className="text-xs text-gray-500">
                      {e.category} &middot; {new Date(e.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <p className="text-sm font-semibold text-gray-900">${e.amount.toFixed(2)}</p>
                    <button onClick={() => { setEditingExpense(e); setShowForm(true); }} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(e.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                {selectedMonth === "all" ? "No expenses found. Add your first expense above." : `No expenses for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}.`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
