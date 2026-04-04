"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { getDebts, addDebt, updateDebt, deleteDebt } from "@/lib/firestore";
import { useDataRefresh } from "@/lib/useDataRefresh";
import { Debt } from "@/lib/types";
import Modal from "@/components/Modal";
import { format } from "date-fns";

type Tab = "active" | "settled";

export default function DebtsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("active");
  const [showForm, setShowForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  // Form state
  const [type, setType] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  const loadDebts = useCallback(async () => {
    if (!user) return;
    try {
      const d = await getDebts(user.uid);
      setDebts(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load debts");
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
    getDebts(user.uid)
      .then((d) => { if (!cancelled) { setDebts(d); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Failed to load debts"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user]);

  useDataRefresh(loadDebts);

  function resetForm() {
    setType("owed_to_me"); setPersonName(""); setAmount(""); setDescription("");
    setDate(format(new Date(), "yyyy-MM-dd")); setEditingDebt(null); setShowForm(false);
  }

  function startEdit(debt: Debt) {
    setType(debt.type); setPersonName(debt.personName); setAmount(debt.amount.toString());
    setDescription(debt.description); setDate(debt.date.split("T")[0]);
    setEditingDebt(debt); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const data = {
      userId: user.uid, type, personName, amount: parseFloat(amount),
      description, date: new Date(date).toISOString(), settled: false,
    };
    if (editingDebt) {
      await updateDebt(editingDebt.id, { ...data, settled: editingDebt.settled, settledDate: editingDebt.settledDate });
    } else {
      await addDebt(data);
    }
    resetForm();
    await loadDebts();
    setSubmitting(false);
  }

  async function handleSettle(debt: Debt) {
    await updateDebt(debt.id, { settled: true, settledDate: new Date().toISOString() });
    await loadDebts();
  }

  async function handleUnsettle(debt: Debt) {
    await updateDebt(debt.id, { settled: false, settledDate: undefined });
    await loadDebts();
  }

  async function handleDelete(id: string) {
    await deleteDebt(id);
    await loadDebts();
  }

  if (authLoading || !user || loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="text-gray-400">Loading debts...</div></div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load debts</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

  const activeDebts = debts.filter((d) => !d.settled);
  const settledDebts = debts.filter((d) => d.settled);
  const displayDebts = tab === "active" ? activeDebts : settledDebts;

  const totalOwedToMe = activeDebts.filter((d) => d.type === "owed_to_me").reduce((s, d) => s + d.amount, 0);
  const totalIOwe = activeDebts.filter((d) => d.type === "i_owe").reduce((s, d) => s + d.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Debts & Collections</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
          + Add Entry
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Owed to You</p>
          <p className="text-2xl font-bold text-green-600">${totalOwedToMe.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">You Owe</p>
          <p className="text-2xl font-bold text-red-600">${totalIOwe.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Net Balance</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "active" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Active ({activeDebts.length})
        </button>
        <button
          onClick={() => setTab("settled")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "settled" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Settled ({settledDebts.length})
        </button>
      </div>

      {/* Debt list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y divide-gray-100">
        {displayDebts.length > 0 ? (
          displayDebts.map((debt) => (
            <div key={debt.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                      debt.type === "owed_to_me" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {debt.type === "owed_to_me" ? "They owe you" : "You owe"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{debt.personName}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{debt.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(debt.date).toLocaleDateString()}
                    {debt.settled && debt.settledDate && (
                      <span className="ml-2 text-green-600">Settled {new Date(debt.settledDate).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4">
                  <p className={`text-lg font-bold ${debt.type === "owed_to_me" ? "text-green-600" : "text-red-600"}`}>
                    ${debt.amount.toFixed(2)}
                  </p>
                  <div className="flex gap-2">
                    {!debt.settled ? (
                      <button onClick={() => handleSettle(debt)}
                        className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded font-medium hover:bg-green-100 transition-colors">
                        Settle
                      </button>
                    ) : (
                      <button onClick={() => handleUnsettle(debt)}
                        className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded font-medium hover:bg-gray-100 transition-colors">
                        Reopen
                      </button>
                    )}
                    <button onClick={() => startEdit(debt)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(debt.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-400 text-sm">
            {tab === "active" ? "No active debts. Add one to start tracking." : "No settled debts yet."}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={resetForm} title={editingDebt ? "Edit Entry" : "New Debt / Collection"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setType("owed_to_me")}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${type === "owed_to_me" ? "bg-green-50 border-green-300 text-green-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                They Owe Me
              </button>
              <button type="button" onClick={() => setType("i_owe")}
                className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${type === "i_owe" ? "bg-red-50 border-red-300 text-red-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                I Owe Them
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
            <input type="text" required value={personName} onChange={(e) => setPersonName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="What for?" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? "Saving..." : editingDebt ? "Update" : "Add Entry"}
            </button>
            <button type="button" onClick={resetForm}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
