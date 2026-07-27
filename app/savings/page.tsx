"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useDataRefresh } from "@/lib/useDataRefresh";
import {
  getSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
} from "@/lib/firestore";
import { SavingsGoal } from "@/lib/types";
import Modal from "@/components/Modal";

export default function SavingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [now] = useState(() => Date.now());

  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fundGoal, setFundGoal] = useState<SavingsGoal | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const loadGoals = useCallback(async () => {
    if (!user) return;
    try {
      const g = await getSavingsGoals(user.uid);
      setGoals(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load savings goals");
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
    getSavingsGoals(user.uid)
      .then((g) => { if (!cancelled) { setGoals(g); setLoading(false); } })
      .catch((err) => { if (!cancelled) { setError(err instanceof Error ? err.message : "Failed to load savings goals"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [user]);

  useDataRefresh(loadGoals);

  function resetForm() {
    setName(""); setTargetAmount(""); setCurrentAmount(""); setDeadline("");
    setEditingGoal(null); setShowForm(false);
  }

  function startEdit(goal: SavingsGoal) {
    setName(goal.name); setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString()); setDeadline(goal.deadline.split("T")[0]);
    setEditingGoal(goal); setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const data = {
      userId: user.uid, name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || "0"),
      deadline: new Date(deadline).toISOString(),
    };
    if (editingGoal) {
      await updateSavingsGoal(editingGoal.id, data);
    } else {
      await addSavingsGoal(data);
    }
    resetForm();
    await loadGoals();
    setSubmitting(false);
  }

  async function handleAddFunds() {
    if (!fundGoal) return;
    const add = parseFloat(fundAmount);
    if (isNaN(add) || add <= 0) return;
    await updateSavingsGoal(fundGoal.id, { currentAmount: fundGoal.currentAmount + add });
    setFundGoal(null);
    setFundAmount("");
    await loadGoals();
  }

  async function handleDelete(id: string) {
    await deleteSavingsGoal(id);
    await loadGoals();
  }

  if (authLoading || !user || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400">Loading savings goals...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Could not load savings goals</h2>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">Retry</button>
        </div>
      </div>
    );
  }

 return (
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

    {/* HEADER */}
    <div className="flex items-center justify-between mb-8">

      <div>
        <h1 className="font-heading text-3xl font-bold bg-linear-to-r from-emerald-400 via-cyan-400 to-purple-500 text-transparent bg-clip-text">
          Savings Goals
        </h1>

        <p className="text-sm text-gray-400 mt-2">
          Build your future one milestone at a time.
        </p>
      </div>

      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        className="bg-linear-to-r from-emerald-400 to-purple-500 text-black px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:scale-105 transition-all duration-300"
      >
        + New Goal
      </button>
    </div>

    {/* FORM */}
    {showForm && (
      <form
        onSubmit={handleSubmit}
        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6 mb-6 space-y-5"
      >

        <h2 className="text-xl font-semibold text-white">
          {editingGoal ? "Edit Goal" : "New Savings Goal"}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* NAME */}
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-300 mb-2">
              Goal Name
            </label>

            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Vacation"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* TARGET */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Target Amount ($)
            </label>

            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="5000"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {/* CURRENT */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Current Saved ($)
            </label>

            <input
              type="number"
              step="0.01"
              min="0"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          {/* DEADLINE */}
          <div className="sm:col-span-2">
            <label className="block text-sm text-gray-300 mb-2">
              Deadline
            </label>

            <input
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-3 pt-2">

          <button
            type="submit"
            disabled={submitting}
            className="bg-linear-to-r from-emerald-400 to-purple-500 text-black px-5 py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {submitting
              ? "Saving..."
              : editingGoal
              ? "Update Goal"
              : "Create Goal"}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="border border-white/10 bg-white/5 text-gray-300 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition"
          >
            Cancel
          </button>

        </div>
      </form>
    )}

    {/* GOALS LIST */}
    {goals.length > 0 ? (
      <div className="space-y-5">

        {goals.map((goal, index) => {

          const pct = Math.min(
            (goal.currentAmount / goal.targetAmount) * 100,
            100
          );

          const remaining = goal.targetAmount - goal.currentAmount;

          const deadlineDate = new Date(goal.deadline);

          const daysLeft = Math.max(
            0,
            Math.ceil(
              (deadlineDate.getTime() - now) /
                (1000 * 60 * 60 * 24)
            )
          );

          const isOverdue = daysLeft === 0 && pct < 100;

          const gradients = [
            "from-emerald-400 to-green-500",
            "from-purple-400 to-pink-500",
            "from-cyan-400 to-blue-500",
            "from-orange-400 to-red-500",
            "from-yellow-400 to-orange-500",
          ];

          return (
            <div
              key={goal.id}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-6 hover:bg-white/[0.07] transition-all duration-300"
            >

              {/* TOP */}
              <div className="flex items-start justify-between mb-5">

                <div>

                  <h3 className="text-lg font-semibold text-white">
                    {goal.name}
                  </h3>

                  <p className="text-xs text-gray-400 mt-1">

                    Deadline: {deadlineDate.toLocaleDateString()}

                    {isOverdue && (
                      <span className="text-red-400 ml-2 font-medium">
                        Overdue
                      </span>
                    )}

                    {!isOverdue && daysLeft > 0 && (
                      <span className="text-gray-500 ml-2">
                        {daysLeft} days left
                      </span>
                    )}
                  </p>

                </div>

                {/* ACTIONS */}
                <div className="flex gap-2 flex-wrap justify-end">

                  <button
                    onClick={() => {
                      setFundGoal(goal);
                      setFundAmount("");
                    }}
                    className="text-xs bg-emerald-400/10 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-400/20 transition"
                  >
                    + Add Funds
                  </button>

                  <button
                    onClick={() => startEdit(goal)}
                    className="text-xs text-cyan-300 hover:text-cyan-200 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition"
                  >
                    Delete
                  </button>

                </div>
              </div>

              {/* STATS */}
              <div className="flex justify-between text-sm text-gray-300 mb-2">

                <span>
                  ${goal.currentAmount.toFixed(2)} saved
                </span>

                <span>
                  ${goal.targetAmount.toFixed(2)} goal
                </span>

              </div>

              {/* PROGRESS */}
              <div className="h-3 bg-white/10 rounded-full overflow-hidden mb-3">

                <div
                  className={`h-full rounded-full bg-linear-to-r ${
                    pct >= 100
                      ? "from-green-400 to-emerald-500"
                      : gradients[index % gradients.length]
                  } transition-all duration-500 shadow-lg`}
                  style={{ width: `${pct}%` }}
                />

              </div>

              {/* FOOTER */}
              <div className="flex justify-between text-xs text-gray-400">

                <span>
                  {pct.toFixed(0)}% complete
                </span>

                {remaining > 0 ? (
                  <span>
                    ${remaining.toFixed(2)} to go
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium">
                    Goal reached!
                  </span>
                )}

              </div>

            </div>
          );
        })}
      </div>
    ) : (
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-lg p-10 text-center">

        <p className="text-gray-300">
          No savings goals yet.
        </p>

        <p className="text-gray-500 text-sm mt-2">
          Create one to start building your future.
        </p>

      </div>
    )}

    {/* MODAL */}
    <Modal
      open={!!fundGoal}
      onClose={() => setFundGoal(null)}
      title={`Add Funds — ${fundGoal?.name ?? ""}`}
    >

      <div className="space-y-5">

        <div>

          <label className="block text-sm text-gray-900 mb-2">
            Amount ($)
          </label>

          <input
            type="number"
            step="0.01"
            min="0.01"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            placeholder="0.00"
            autoFocus
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />

        </div>

        {fundGoal && (
          <p className="text-xs text-gray-900">
            Current:
            <span className="text-white ml-1">
              ${fundGoal.currentAmount.toFixed(2)}
            </span>

            <span className="mx-1">/</span>

            <span className="text-emerald-400">
              ${fundGoal.targetAmount.toFixed(2)}
            </span>
          </p>
        )}

        <div className="flex gap-3">

          <button
            onClick={handleAddFunds}
            disabled={!fundAmount || parseFloat(fundAmount) <= 0}
            className="flex-1 bg-linear-to-r from-emerald-400 to-green-500 text-black py-3 rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
          >
            Add Funds
          </button>

          <button
            onClick={() => setFundGoal(null)}
            className="flex-1 bg-linear-to-r from-emerald-400 to-green-500 text-black py-3 rounded-xl text-sm font-semibold hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>

        </div>
      </div>
    </Modal>
  </div>
);
}
