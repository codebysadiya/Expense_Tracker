"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

  const [open, setOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

    {/* ALERT MODAL (UNCHANGED LOGIC) */}
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

    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">

      <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 text-transparent bg-clip-text tracking-tight">
        Expenses
      </h1>

      <div className="flex items-center gap-3">

        {/* EXPORT (unchanged logic) */}
        <ExportMenu
          onExportExcel={() => exportExpensesToExcel(filtered)}
          onExportPDF={() => exportExpensesToPDF(filtered)}
          onExportFullExcel={() => { throw new Error("Function not implemented."); }}
          onExportFullPDF={() => { throw new Error("Function not implemented."); }}
        />

        {/* ✨ IMPROVED ADD BUTTON */}
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="relative px-5 py-2.5 rounded-xl text-sm font-semibold text-black
                     bg-gradient-to-r from-emerald-300 via-emerald-400 to-cyan-300
                     shadow-lg shadow-emerald-500/20
                     hover:scale-105 active:scale-95 transition-all duration-200
                     overflow-hidden"
        >
          <span className="relative z-10">+ Add Expense</span>

          {/* glow layer */}
          <span className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition"></span>
        </button>

      </div>
    </div>

    {/* FORM */}
    {showForm && (
      <div className="mb-6 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl">
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    )}

    {/* LAYOUT */}
    <div className="flex flex-col md:flex-row gap-6">

      {/* SIDEBAR */}
      <div className="md:w-56 shrink-0">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl overflow-hidden">

          <div className="px-4 py-3 border-b border-white/10 bg-white/5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Filter by Month
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">

            <button
              onClick={() => setSelectedMonth("all")}
              className={`w-full text-left px-4 py-3 text-sm transition flex items-center justify-between ${
                selectedMonth === "all"
                  ? "bg-white/10 text-emerald-300 border-l-2 border-emerald-400"
                  : "text-gray-300 hover:bg-white/5"
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
                  className={`w-full text-left px-4 py-3 text-sm transition flex items-center justify-between ${
                    active
                      ? "bg-white/10 text-emerald-300 border-l-2 border-emerald-400"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  <span>{format(new Date(m + "-01"), "MMM yyyy")}</span>

                  {over && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
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

        {/* FILTER ROW */}
        <div className="flex items-center justify-between mb-5">

          {/* (keep your select for now – can upgrade later if you want) */}
          <div ref={filterDropdownRef} className="relative">
  <button
    onClick={() => setOpen((prev) => !prev)}
    className="min-w-[180px] px-4 py-2 rounded-xl text-sm
               bg-white/5 border border-white/10 text-gray-200
               backdrop-blur-xl shadow-lg
               flex items-center justify-between
               hover:bg-white/10 transition"
  >
    <span>{filterCategory === "All" ? "All Categories" : filterCategory}</span>
    <span className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
  </button>

  {open && (
    <div
            className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl
                      bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <button
              onClick={() => {
                setFilterCategory("All");
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2 text-sm transition ${
                filterCategory === "All"
                  ? "bg-emerald-500/15 text-emerald-300 font-medium"
                  : "text-gray-200 hover:bg-white/10"
              }`}
            >
              All Categories
            </button>

            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setFilterCategory(c);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition ${
                  filterCategory === c
                    ? "bg-emerald-500/15 text-emerald-300 font-medium"
                    : "text-gray-200 hover:bg-white/10"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

          <p className="text-sm text-gray-400">
            {filtered.length} expense{filtered.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-semibold text-emerald-300">
              ${monthTotal.toFixed(2)}
            </span>
          </p>

        </div>

        {/* LIST */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-xl divide-y divide-white/10">

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
                  <p className="text-sm font-semibold text-emerald-300">
                    ${e.amount.toFixed(2)}
                  </p>

                  <button onClick={() => { setEditingExpense(e); setShowForm(true); }} className="text-xs text-cyan-300 hover:text-cyan-200">
                    Edit
                  </button>

                  <button onClick={() => handleDelete(e.id)} className="text-xs text-red-300 hover:text-red-200">
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