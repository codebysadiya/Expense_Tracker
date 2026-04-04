"use client";

interface BudgetProgressProps {
  spent: number;
  budget: number;
  showAlert?: boolean;
}

export default function BudgetProgress({ spent, budget, showAlert = false }: BudgetProgressProps) {
  const pct = Math.min((spent / budget) * 100, 100);
  const remaining = budget - spent;
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-green-500";

  return (
    <div>
      {showAlert && pct >= 100 && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md mb-3">
          Budget exceeded! You are ${Math.abs(remaining).toFixed(2)} over your ${budget.toFixed(2)} budget.
        </div>
      )}
      {showAlert && pct >= 80 && pct < 100 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm p-3 rounded-md mb-3">
          Warning: You&apos;ve used {pct.toFixed(0)}% of your budget. Only ${remaining.toFixed(2)} remaining.
        </div>
      )}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% used</p>
    </div>
  );
}
