"use client";

import { useState } from "react";
import { Expense, CATEGORIES } from "@/lib/types";
import { format } from "date-fns";
import { parseReceiptText } from "@/utils/nlp";

interface ExpenseFormProps {
  expense?: Expense | null;
  onSubmit: (data: { amount: number; category: string; date: string; description: string }) => Promise<void>;
  onCancel: () => void;
}

type FillMode = "image" | "text";

export default function ExpenseForm({ expense, onSubmit, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState(expense ? expense.amount.toString() : "");
  const [category, setCategory] = useState<string>(expense?.category ?? CATEGORIES[0]);
  const [date, setDate] = useState(expense ? expense.date.split("T")[0] : format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState(expense?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [fillMode, setFillMode] = useState<FillMode>("image");
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);

  function applyParsed(result: ReturnType<typeof parseReceiptText>) {
    if (result.amount && result.amount > 0) setAmount(result.amount.toFixed(2));
    if (result.category) setCategory(result.category);
    if (result.date) setDate(result.date);
    if (result.description && result.description !== "Expense") setDescription(result.description);
    const filled: string[] = [];
    if (result.amount) filled.push(`amount $${result.amount.toFixed(2)}`);
    if (result.description && result.description !== "Expense") filled.push(`description "${result.description}"`);
    filled.push(`category ${result.category}`);
    filled.push(`date ${result.date}`);
    setParseStatus({ kind: "ok", text: `Auto-filled: ${filled.join(", ")}.` });
  }

  async function handleParseText() {
    if (!pasteText.trim()) {
      setParseStatus({ kind: "err", text: "Paste a receipt or message first." });
      return;
    }
    setParsing(true);
    setParseStatus(null);
    try {
      const result = parseReceiptText(pasteText);
      if (!result.amount) {
        setParseStatus({ kind: "err", text: "Couldn't find an amount in the text. Fill the form manually." });
      } else {
        applyParsed(result);
      }
    } finally {
      setParsing(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    setParsing(true);
    setParseStatus(null);
    setOcrProgress(0);
    try {

      const tesseract = await import("tesseract.js").catch(() => null);
      if (!tesseract) {
        setParseStatus({
          kind: "err",
          text: "OCR engine not installed. Run: npm install tesseract.js",
        });
        return;
      }
      const { data } = await tesseract.default.recognize(file, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setOcrProgress(Math.round(m.progress * 100));
        },
      });
      const result = parseReceiptText(data.text || "");
      if (!result.amount) {
        setParseStatus({ kind: "err", text: "Couldn't read an amount from the image. Try a clearer photo or paste the text instead." });
      } else {
        applyParsed(result);
      }
    } catch (err) {
      setParseStatus({ kind: "err", text: err instanceof Error ? `OCR failed: ${err.message}` : "OCR failed." });
    } finally {
      setParsing(false);
      setOcrProgress(0);
    }
  }

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
  <form
    onSubmit={handleSubmit}
    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-xl p-6 mb-6 space-y-5"
  >
    {/* GLOW BACKGROUND ELEMENTS */}
    <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/20 blur-3xl rounded-full" />
    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full" />

    {/* TITLE */}
    <h2 className="text-lg font-semibold bg-gradient-to-r from-emerald-300 to-purple-400 text-transparent bg-clip-text">
      {expense ? "Edit Expense" : "New Expense"}
    </h2>

    {/* AUTO FILL SECTION */}
    {!expense && (
      <div className="relative rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
            Auto-fill
          </p>

          <div className="inline-flex rounded-lg border border-white/10 overflow-hidden text-xs backdrop-blur-md">
            <button
              type="button"
              onClick={() => setFillMode("image")}
              className={`px-3 py-1.5 transition ${
                fillMode === "image"
                  ? "bg-emerald-500 text-black font-semibold"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Receipt
            </button>

            <button
              type="button"
              onClick={() => setFillMode("text")}
              className={`px-3 py-1.5 transition ${
                fillMode === "text"
                  ? "bg-purple-500 text-black font-semibold"
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              Paste text
            </button>
          </div>
        </div>

        {fillMode === "image" ? (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={parsing}
              className="block w-full text-sm text-gray-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-500 file:text-black file:font-semibold hover:file:bg-emerald-400 file:cursor-pointer disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              Upload receipt — AI will extract details automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste SMS, email or bill text..."
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />

            <button
              type="button"
              onClick={handleParseText}
              disabled={parsing || !pasteText.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 text-black px-3 py-1.5 rounded-lg text-xs font-semibold transition disabled:opacity-50"
            >
              {parsing ? "Parsing..." : "Auto-fill"}
            </button>
          </div>
        )}

        {parsing && fillMode === "image" && ocrProgress > 0 && (
          <div className="text-xs text-emerald-300">
            Reading receipt... {ocrProgress}%
          </div>
        )}

        {parseStatus && (
          <div
            className={`text-xs rounded-lg px-3 py-2 border ${
              parseStatus.kind === "ok"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-red-500/10 text-red-300 border-red-500/20"
            }`}
          >
            {parseStatus.text}
          </div>
        )}
      </div>
    )}

    {/* INPUT GRID */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm text-gray-300 mb-1">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-300 mb-1">Description</label>
        <input
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>
    </div>

    {/* BUTTONS */}
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={submitting}
        className="bg-gradient-to-r from-emerald-400 to-purple-500 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:scale-[1.02] transition disabled:opacity-50"
      >
        {submitting ? "Saving..." : expense ? "Update" : "Add Expense"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-white/5 transition"
      >
        Cancel
      </button>
    </div>
  </form>
);
}