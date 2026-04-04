"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getExpenses, addExpense, updateExpense, deleteExpense } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Expense, CATEGORIES } from "@/lib/types";
import ExpenseForm from "@/components/ExpenseForm";
import ExportMenu from "@/components/ExportMenu";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [selectedMonth, setSelectedMonth] = useState("all");

  const months = generateMonthList(12);

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    try {
      const exps = await getExpenses(user.uid);
      setAllExpenses(exps);
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
    getExpenses(user.uid)
      .then((exps) => { if (!cancelled) { setAllExpenses(exps); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Failed to load expenses"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user]);

  useDataRefresh(loadExpenses);

  async function handleSubmit(data: { amount: number; category: string; date: string; description: string }) {
    if (!user) return;
    if (editingExpense) {
      await updateExpense(editingExpense.id, data);
    } else {
      await addExpense({ userId: user.uid, ...data, createdAt: new Date().toISOString() });
    }
    setShowForm(false);
    setEditingExpense(null);
    await loadExpenses();
  }

  function handleCancel() { setShowForm(false); setEditingExpense(null); }

  async function handleDelete(id: string) {
    await deleteExpense(id);
    await loadExpenses();
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
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    m === selectedMonth
                      ? "bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {format(new Date(m + "-01"), "MMM yyyy")}
                </button>
              ))}
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
