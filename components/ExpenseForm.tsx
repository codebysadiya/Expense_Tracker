"use client";

import { useState } from "react";
import { Expense, CATEGORIES } from "@/lib/types";
import { format } from "date-fns";

interface ExpenseFormProps {
  expense?: Expense | null;
  onSubmit: (data: {
    amount: number;
    category: string;
    date: string;
    description: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({
  expense,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(
    expense ? expense.amount.toString() : ""
  );
  const [category, setCategory] = useState(
    expense?.category ?? CATEGORIES[0]
  );
  const [date, setDate] = useState(
    expense ? expense.date.split("T")[0] : format(new Date(), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState(
    expense?.description ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    await onSubmit({
      amount: parseFloat(amount),
      category,
      date: new Date(date).toISOString(),
      description,
    });

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-white">

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* AMOUNT */}
        <div>
          <label className="text-xs text-gray-300">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="
              w-full mt-1 rounded-xl px-3 py-2 text-sm
              bg-white/5 backdrop-blur-md
              border border-white/10 text-white
              placeholder:text-gray-400
              shadow-inner shadow-black/30
              focus:ring-2 focus:ring-emerald-400/60
              focus:border-emerald-400/40
              outline-none transition
            "
          />
        </div>

        {/* CATEGORY */}
        <div>
          <label className="text-xs text-gray-300">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="
              w-full mt-1 rounded-xl px-3 py-2 text-sm
              bg-white/5 backdrop-blur-md
              border border-white/10 text-white
              focus:ring-2 focus:ring-emerald-400/60
              outline-none transition
            "
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#0b0f14]">
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* DATE */}
        <div>
          <label className="text-xs text-gray-300">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="
              w-full mt-1 rounded-xl px-3 py-2 text-sm
              bg-white/5 backdrop-blur-md
              border border-white/10 text-white
              focus:ring-2 focus:ring-emerald-400/60
              outline-none transition
            "
          />
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="text-xs text-gray-300">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="
              w-full mt-1 rounded-xl px-3 py-2 text-sm
              bg-white/5 backdrop-blur-md
              border border-white/10 text-white
              placeholder:text-gray-400
              shadow-inner shadow-black/30
              focus:ring-2 focus:ring-emerald-400/60
              outline-none transition
            "
          />
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-3 pt-2">

        <button
          type="submit"
          disabled={submitting}
          className="
            px-4 py-2 rounded-xl text-sm font-semibold text-black
            bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500
            shadow-[0_0_25px_rgba(34,211,238,0.25)]
            hover:scale-[1.03] active:scale-[0.98]
            transition disabled:opacity-50
          "
        >
          {submitting ? "Saving..." : expense ? "Update" : "Add Expense"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="
            px-4 py-2 rounded-xl text-sm font-medium
            bg-white/5 border border-white/10 text-gray-300
            hover:bg-white/10 hover:text-white
            transition
          "
        >
          Cancel
        </button>

      </div>
    </form>
  );
}