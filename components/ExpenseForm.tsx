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
      // tesseract.js is an optional runtime dependency — install with `npm install tesseract.js`
      // @ts-expect-error optional dep, no types until installed
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 mb-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {expense ? "Edit Expense" : "New Expense"}
      </h2>

      {!expense && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Auto-fill</p>
            <div className="inline-flex rounded-md border border-indigo-200 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setFillMode("image")}
                className={`px-3 py-1.5 ${fillMode === "image" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50"}`}
              >
                Receipt / bill
              </button>
              <button
                type="button"
                onClick={() => setFillMode("text")}
                className={`px-3 py-1.5 ${fillMode === "text" ? "bg-indigo-600 text-white" : "bg-white text-indigo-700 hover:bg-indigo-50"}`}
              >
                Paste text
              </button>
            </div>
          </div>

          {fillMode === "image" ? (
            <div>
              <label className="block">
                <span className="sr-only">Upload receipt</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={parsing}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 file:cursor-pointer disabled:opacity-50"
                />
              </label>
              <p className="text-xs text-gray-500 mt-1">Upload a photo of a receipt or bill — we&apos;ll read it.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste an SMS, email, or receipt text here…"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <button
                type="button"
                onClick={handleParseText}
                disabled={parsing || !pasteText.trim()}
                className="bg-indigo-600 text-white px-3 py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {parsing ? "Parsing…" : "Auto-fill from text"}
              </button>
            </div>
          )}

          {parsing && fillMode === "image" && ocrProgress > 0 && (
            <div className="text-xs text-indigo-700">Reading receipt… {ocrProgress}%</div>
          )}
          {parseStatus && (
            <div className={`text-xs rounded-md px-3 py-2 ${parseStatus.kind === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {parseStatus.text}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="0.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="What was this for?"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : expense ? "Update" : "Add Expense"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
