"use client";

import { useEffect, useRef, useState } from "react";
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

  // Custom category dropdown UI state (replaces native <select> styling only;
  // `category` / `setCategory` remain the single source of truth).
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    Math.max(getCategoryIndex(category), 0)
  );
  const categoryWrapperRef = useRef<HTMLDivElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const categoryOptionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // CATEGORIES is typed as a literal-union array, but `category` is plain
  // `string`, so .indexOf needs a narrowing cast. Centralized here so the
  // cast only happens once instead of at every call site.
  function getCategoryIndex(value: string) {
    return CATEGORIES.indexOf(value as (typeof CATEGORIES)[number]);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryWrapperRef.current &&
        !categoryWrapperRef.current.contains(e.target as Node)
      ) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (categoryOpen) {
      categoryOptionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [categoryOpen, highlightedIndex]);

  function selectCategory(c: string) {
    setCategory(c);
    setCategoryOpen(false);
    categoryButtonRef.current?.focus();
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!categoryOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setHighlightedIndex(Math.max(getCategoryIndex(category), 0));
        setCategoryOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % CATEGORIES.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        selectCategory(CATEGORIES[highlightedIndex]);
        break;
      case "Escape":
        e.preventDefault();
        setCategoryOpen(false);
        break;
      case "Tab":
        setCategoryOpen(false);
        break;
      default:
        break;
    }
  }

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
    className="relative overflow-visible rounded-[28px] border border-white/[0.08] bg-neutral-950/70 backdrop-blur-2xl shadow-[0_25px_60px_-20px_rgba(0,0,0,0.65)] p-7 sm:p-8 mb-6 space-y-6"
  >
    {/* HAIRLINE TOP ACCENT */}
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
    {/* AMBIENT GLOW */}
    <div className="pointer-events-none absolute -top-24 right-0 w-72 h-72 bg-emerald-500/10 blur-[100px] rounded-full" />

    {/* TITLE */}
    <div className="relative space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-emerald-400/80">
        {expense ? "Edit Entry" : "New Entry"}
      </p>
      <h2 className="font-serif text-2xl text-neutral-50 tracking-tight">
        {expense ? "Edit Expense" : "Add Expense"}
      </h2>
      <div className="h-px w-12 bg-gradient-to-r from-emerald-400/70 to-transparent" />
    </div>

    {/* AUTO FILL SECTION */}
    {!expense && (
      <div className="relative rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
            Auto-fill
          </p>

          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.03] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFillMode("image")}
              className={`px-3.5 py-1.5 rounded-full transition ${
                fillMode === "image"
                  ? "bg-emerald-400 text-neutral-950 font-medium shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              Receipt
            </button>

            <button
              type="button"
              onClick={() => setFillMode("text")}
              className={`px-3.5 py-1.5 rounded-full transition ${
                fillMode === "text"
                  ? "bg-emerald-400 text-neutral-950 font-medium shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200"
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
              className="block w-full text-sm text-neutral-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-full file:border-0 file:bg-emerald-400 file:text-neutral-950 file:font-medium hover:file:bg-emerald-300 file:cursor-pointer file:transition disabled:opacity-50"
            />
            <p className="text-xs text-neutral-500 mt-1.5">
              Upload receipt — AI will extract details automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste SMS, email or bill text..."
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition"
            />

            <button
              type="button"
              onClick={handleParseText}
              disabled={parsing || !pasteText.trim()}
              className="bg-emerald-400 hover:bg-emerald-300 text-neutral-950 px-4 py-1.5 rounded-full text-xs font-medium transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {parsing ? "Parsing..." : "Auto-fill"}
            </button>
          </div>
        )}

        {parsing && fillMode === "image" && ocrProgress > 0 && (
          <div className="text-xs text-emerald-400/80">
            Reading receipt... {ocrProgress}%
          </div>
        )}

        {parseStatus && (
          <div
            className={`text-xs rounded-xl px-3.5 py-2.5 border ${
              parseStatus.kind === "ok"
                ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
                : "bg-rose-500/10 text-rose-300 border-rose-500/20"
            }`}
          >
            {parseStatus.text}
          </div>
        )}
      </div>
    )}

    {/* INPUT GRID */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div>
        <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5">Amount</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition"
          placeholder="0.00"
        />
      </div>

      <div ref={categoryWrapperRef} className="relative">
        <label id="category-label" className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5">
          Category
        </label>

        <button
          ref={categoryButtonRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={categoryOpen}
          aria-labelledby="category-label"
          aria-controls="category-listbox"
          aria-activedescendant={categoryOpen ? `category-option-${highlightedIndex}` : undefined}
          onClick={() => {
            setHighlightedIndex(Math.max(getCategoryIndex(category), 0));
            setCategoryOpen((open) => !open);
          }}
          onKeyDown={handleCategoryKeyDown}
          className="w-full flex items-center justify-between gap-2 rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 text-left hover:border-white/20 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition"
        >
          <span className="truncate">{category}</span>
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className={`h-4 w-4 flex-shrink-0 text-neutral-500 transition-transform duration-200 ${
              categoryOpen ? "rotate-180 text-emerald-400" : ""
            }`}
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div
          aria-hidden={!categoryOpen}
          className={`absolute left-0 right-0 z-20 mt-2 origin-top transition-all duration-150 ease-out ${
            categoryOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <ul
            id="category-listbox"
            role="listbox"
            aria-labelledby="category-label"
            tabIndex={-1}
            className="max-h-56 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 backdrop-blur-2xl shadow-2xl p-1.5 space-y-0.5"
          >
            {CATEGORIES.map((c, i) => {
              const isSelected = c === category;
              const isHighlighted = i === highlightedIndex;
              return (
                <li
                  key={c}
                  id={`category-option-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  ref={(el) => {
                    categoryOptionRefs.current[i] = el;
                  }}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectCategory(c)}
                  className={`px-3.5 py-2 rounded-xl text-sm cursor-pointer transition ${
                    isSelected
                      ? "bg-emerald-400/10 text-emerald-300 font-medium"
                      : isHighlighted
                      ? "bg-white/[0.06] text-neutral-100"
                      : "text-neutral-300"
                  }`}
                >
                  {c}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5">Date</label>
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wide text-neutral-400 mb-1.5">Description</label>
        <input
          type="text"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What was this for?"
          className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition"
        />
      </div>
    </div>

    {/* BUTTONS */}
    <div className="flex gap-3 pt-2">
      <button
        type="submit"
        disabled={submitting}
        className="bg-emerald-400 hover:bg-emerald-300 text-neutral-950 px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition shadow-[0_8px_20px_-6px_rgba(16,185,129,0.45)] disabled:opacity-50 disabled:shadow-none"
      >
        {submitting ? "Saving..." : expense ? "Update" : "Add Expense"}
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="border border-white/10 text-neutral-300 px-5 py-2.5 rounded-xl text-sm hover:bg-white/[0.04] transition"
      >
        Cancel
      </button>
    </div>
  </form>
);
}