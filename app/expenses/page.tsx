"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
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
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
  function handleClick(e: MouseEvent) {
    if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
      setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const COLORS = [
  "#22c55e", "#8b5cf6", "#ec4899", "#f97316",
  "#06b6d4", "#eab308", "#ef4444"
  ];

  return (
  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-purple-400 text-transparent bg-clip-text">
        Expenses
      </h1>

      <div className="flex items-center gap-3">
        <ExportMenu
          onExportExcel={() => exportExpensesToExcel(filtered)}
          onExportPDF={() => exportExpensesToPDF(filtered)}
          onExportFullExcel={() => {}}   
          onExportFullPDF={() => {}}
        />

        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="bg-gradient-to-r from-emerald-400 to-purple-500 text-black px-5 py-2 rounded-lg text-sm font-semibold shadow-md hover:scale-105 transition"
        >
          + Add Expense
        </button>
      </div>
    </div>

    {showForm && (
      <div className="mb-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-6 shadow-lg">
        <ExpenseForm expense={editingExpense} onSubmit={handleSubmit} onCancel={handleCancel} />
      </div>
    )}

    <div className="flex flex-col md:flex-row gap-6">

      {/* SIDEBAR */}
      <div className="md:w-56 shrink-0">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-lg overflow-hidden">

          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Filter by Month
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">

            <button
              onClick={() => setSelectedMonth("all")}
              className={`w-full text-left px-4 py-2.5 text-sm transition ${
                selectedMonth === "all"
                  ? "bg-white/10 text-white border-l-2 border-emerald-400"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              All Time
            </button>

            {months.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`w-full text-left px-4 py-2.5 text-sm transition ${
                  m === selectedMonth
                    ? "bg-white/10 text-white border-l-2 border-emerald-400"
                    : "text-gray-300 hover:bg-white/5"
                }`}
              >
                {format(new Date(m + "-01"), "MMM yyyy")}
              </button>
            ))}

          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 min-w-0">

        {/* FILTER ROW */}
        <div className="flex items-center justify-between mb-5">

          <div className="relative w-52" ref={categoryRef}>

  {/* BUTTON */}
  <button
    onClick={() => setCategoryOpen(!categoryOpen)}
    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-200 text-sm hover:bg-white/10 transition"
  >
    <span className="flex items-center gap-2">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
      {filterCategory}
    </span>
    <span className="text-xs text-gray-400">▼</span>
  </button>

  {/* DROPDOWN */}
  {categoryOpen && (
    <div className="absolute mt-2 w-full bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg z-50   overflow-hidden">

      {/* ALL */}
      <button
        onClick={() => {
          setFilterCategory("All");
          setCategoryOpen(false);
        }}
        className="w-full text-left px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition"
      >
        All Categories
      </button>

      {/* CATEGORY LIST */}
      {CATEGORIES.map((c, i) => {
        const color = COLORS[i % COLORS.length];

        return (
          <button
            key={c}
            onClick={() => {
              setFilterCategory(c);
              setCategoryOpen(false);
            }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition"
            >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: color }}
            ></span>
            {c}
          </button>
            );
          })}

        </div>
      )}

    </div>

          <p className="text-sm text-gray-400">
            {filtered.length} expense{filtered.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-semibold text-white">
              ${monthTotal.toFixed(2)}
            </span>
          </p>

        </div>

        {/* LIST */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl shadow-lg divide-y divide-white/10">

          {filtered.length > 0 ? (
            filtered.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition"
              >

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {e.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    {e.category} · {new Date(e.date).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 ml-4">

                  <p className="text-sm font-semibold text-emerald-400">
                    ${e.amount.toFixed(2)}
                  </p>

                  <button
                    onClick={() => { setEditingExpense(e); setShowForm(true); }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Delete
                  </button>

                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-gray-400 text-sm">
              {selectedMonth === "all"
                ? "No expenses yet. Start tracking now."
                : `No expenses for ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}.`}
            </div>
          )}

        </div>

      </div>
    </div>
  </div>
);
}
