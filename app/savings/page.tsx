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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Savings Goals</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors">
          + New Goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{editingGoal ? "Edit Goal" : "New Savings Goal"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Emergency Fund, Vacation" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount ($)</label>
              <input type="number" step="0.01" min="1" required value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="5000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Saved ($)</label>
              <input type="number" step="0.01" min="0" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {submitting ? "Saving..." : editingGoal ? "Update" : "Create Goal"}
            </button>
            <button type="button" onClick={resetForm}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal) => {
            const pct = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
            const remaining = goal.targetAmount - goal.currentAmount;
            const deadlineDate = new Date(goal.deadline);
            const daysLeft = Math.max(0, Math.ceil((deadlineDate.getTime() - now) / (1000 * 60 * 60 * 24)));
            const isOverdue = daysLeft === 0 && pct < 100;
            return (
              <div key={goal.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                    <p className="text-xs text-gray-500">
                      Deadline: {deadlineDate.toLocaleDateString()}
                      {isOverdue && <span className="text-red-500 ml-2 font-medium">Overdue</span>}
                      {!isOverdue && daysLeft > 0 && <span className="text-gray-400 ml-2">{daysLeft} days left</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setFundGoal(goal); setFundAmount(""); }}
                      className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded font-medium hover:bg-green-100 transition-colors">+ Add Funds</button>
                    <button onClick={() => startEdit(goal)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(goal.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>${goal.currentAmount.toFixed(2)} saved</span>
                  <span>${goal.targetAmount.toFixed(2)} goal</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{pct.toFixed(0)}% complete</span>
                  {remaining > 0 ? <span>${remaining.toFixed(2)} to go</span> : <span className="text-green-600 font-medium">Goal reached!</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <p className="text-gray-400">No savings goals yet. Create one to start tracking your progress.</p>
        </div>
      )}

      {/* Add Funds Modal */}
      <Modal open={!!fundGoal} onClose={() => setFundGoal(null)} title={`Add Funds — ${fundGoal?.name ?? ""}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0.00"
              autoFocus
            />
          </div>
          {fundGoal && (
            <p className="text-xs text-gray-400">
              Current: ${fundGoal.currentAmount.toFixed(2)} / ${fundGoal.targetAmount.toFixed(2)} goal
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleAddFunds}
              disabled={!fundAmount || parseFloat(fundAmount) <= 0}
              className="flex-1 bg-green-600 text-white py-2 rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Add Funds
            </button>
            <button
              onClick={() => setFundGoal(null)}
              className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
