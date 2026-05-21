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
    await updateDebt(debt.id, { settled: false, });
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
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    {/* HEADER */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">

      <div>
        <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text">
          Debts & Collections
        </h1>

        <p className="text-sm text-gray-400 mt-2">
          Track borrowed money, repayments, and balances beautifully.
        </p>
      </div>

      <button
        onClick={() => {
          resetForm();
          setShowForm(true);
        }}
        className="bg-linear-to-r from-emerald-400 to-purple-500 text-black px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-300"
      >
        + Add Entry
      </button>
    </div>

    {/* SUMMARY CARDS */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">

      {/* OWED TO YOU */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">

        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/20 blur-3xl rounded-full"></div>

        <p className="text-sm text-gray-400 mb-2 relative z-10">
          Owed to You
        </p>

        <p className="text-3xl font-bold text-emerald-400 relative z-10">
          ${totalOwedToMe.toFixed(2)}
        </p>

      </div>

      {/* YOU OWE */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">

        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-red-400/20 blur-3xl rounded-full"></div>

        <p className="text-sm text-gray-400 mb-2 relative z-10">
          You Owe
        </p>

        <p className="text-3xl font-bold text-red-400 relative z-10">
          ${totalIOwe.toFixed(2)}
        </p>

      </div>

      {/* NET BALANCE */}
      <div className="relative overflow-hidden backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-lg">

        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/20 blur-3xl rounded-full"></div>

        <p className="text-sm text-gray-400 mb-2 relative z-10">
          Net Balance
        </p>

        <p
          className={`text-3xl font-bold relative z-10 ${
            netBalance >= 0
              ? "text-emerald-400"
              : "text-red-400"
          }`}
        >
          {netBalance >= 0 ? "+" : ""}
          ${netBalance.toFixed(2)}
        </p>

      </div>
    </div>

    {/* TABS */}
    <div className="flex gap-2 mb-6 bg-white/5 border border-white/10 rounded-2xl p-1.5 w-fit backdrop-blur-xl">

      <button
        onClick={() => setTab("active")}
        className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
          tab === "active"
            ? "bg-linear-to-r from-emerald-400 to-cyan-400 text-black shadow-lg"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Active ({activeDebts.length})
      </button>

      <button
        onClick={() => setTab("settled")}
        className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
          tab === "settled"
            ? "bg-linear-to-r from-purple-400 to-pink-500 text-black shadow-lg"
            : "text-gray-400 hover:text-white"
        }`}
      >
        Settled ({settledDebts.length})
      </button>

    </div>

    {/* LIST */}
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg divide-y divide-white/10 overflow-hidden">

      {displayDebts.length > 0 ? (
        displayDebts.map((debt) => (

          <div
            key={debt.id}
            className="p-5 hover:bg-white/5 transition-all duration-300"
          >

            <div className="flex items-start justify-between gap-4">

              {/* LEFT */}
              <div className="flex-1 min-w-0">

                <div className="flex items-center gap-3 mb-2 flex-wrap">

                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      debt.type === "owed_to_me"
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : "bg-red-400/10 text-red-400 border border-red-400/20"
                    }`}
                  >
                    {debt.type === "owed_to_me"
                      ? "They owe you"
                      : "You owe"}
                  </span>

                  <span className="text-sm font-semibold text-white">
                    {debt.personName}
                  </span>

                </div>

                <p className="text-sm text-gray-300 truncate">
                  {debt.description}
                </p>

                <p className="text-xs text-gray-500 mt-2">

                  {new Date(debt.date).toLocaleDateString()}

                  {debt.settled && debt.settledDate && (
                    <span className="ml-2 text-emerald-400">
                      Settled {new Date(debt.settledDate).toLocaleDateString()}
                    </span>
                  )}

                </p>

              </div>

              {/* RIGHT */}
              <div className="flex flex-col items-end gap-3">

                <p
                  className={`text-2xl font-bold ${
                    debt.type === "owed_to_me"
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  ${debt.amount.toFixed(2)}
                </p>

                <div className="flex items-center gap-2 flex-wrap justify-end">

                  {!debt.settled ? (
                    <button
                      onClick={() => handleSettle(debt)}
                      className="text-xs bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 px-3 py-1 rounded-lg font-medium hover:bg-emerald-400/20 transition"
                    >
                      Settle
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnsettle(debt)}
                      className="text-xs bg-white/5 border border-white/10 text-gray-300 px-3 py-1 rounded-lg font-medium hover:bg-white/10 transition"
                    >
                      Reopen
                    </button>
                  )}

                  <button
                    onClick={() => startEdit(debt)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(debt.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Delete
                  </button>

                </div>

              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="p-12 text-center">

          <p className="text-gray-400 text-sm">
            {tab === "active"
              ? "No active debts. Add one to start tracking."
              : "No settled debts yet."}
          </p>

        </div>
      )}
    </div>

    {/* MODAL */}
    <Modal
      open={showForm}
      onClose={resetForm}
      title={editingDebt ? "Edit Entry" : "New Debt / Collection"}
    >

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* TYPE */}
        <div>

          <label className="block text-sm text-gray-900 mb-2">
            Type
          </label>

          <div className="flex gap-3">

            <button
              type="button"
              onClick={() => setType("owed_to_me")}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                type === "owed_to_me"
                  ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400"
                  : "border-black/10 text-gray-400 hover:bg-white/5"
              }`}
            >
              They Owe Me
            </button>

            <button
              type="button"
              onClick={() => setType("i_owe")}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                type === "i_owe"
                  ? "bg-red-400/10 border-red-400/30 text-emerald-400"
                  : "border-black/10 text-gray-400 hover:bg-white/5"
              }`}
            >
              I Owe Them
            </button>

          </div>
        </div>

        {/* PERSON */}
        <div>

          <label className="block text-sm text-gray-900 mb-2">
            Person Name
          </label>

          <input
            type="text"
            required
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            placeholder="e.g. John"
            className="w-full bg-white/5 border border-black/10 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 gap-4">

          <div>

            <label className="block text-sm text-gray-900 mb-2">
              Amount ($)
            </label>

            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/5 border border-black/10 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>

            <label className="block text-sm text-gray-900 mb-2">
              Date
            </label>

            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/5 border border-black/10 rounded-xl px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div>

          <label className="block text-sm text-gray-900 mb-2">
            Description
          </label>

          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What for?"
            className="w-full bg-white/5 border border-black/10 rounded-xl px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 pt-2">

          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-linear-to-r from-emerald-400 to-purple-500 text-black py-3 rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : editingDebt
              ? "Update Entry"
              : "Add Entry"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="flex-1 bg-linear-to-r from-emerald-400 to-purple-500 text-black py-3 rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            Cancel
          </button>

        </div>
      </form>
    </Modal>
  </div>
);
}
