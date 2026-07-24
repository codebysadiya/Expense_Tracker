"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getExpenses, getBudget, getSavingsGoals, getDebts, addExpense, setBudget, addDebt, addSavingsGoal } from "@/lib/firestore";
import { format } from "date-fns";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Action {
  tool: string;
  input: Record<string, unknown>;
}

export default function AIChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function getContext() {
    if (!user) return {};
    const currentMonth = format(new Date(), "yyyy-MM");
    const [expenses, budget, savingsGoals, debts] = await Promise.all([
      getExpenses(user.uid),
      getBudget(user.uid, currentMonth),
      getSavingsGoals(user.uid),
      getDebts(user.uid),
    ]);
    return {
      expenses: expenses.map((e) => ({ amount: e.amount, category: e.category, date: e.date, description: e.description })),
      budgetAmount: budget?.amount,
      savingsGoals: savingsGoals.map((g) => ({ name: g.name, targetAmount: g.targetAmount, currentAmount: g.currentAmount, deadline: g.deadline })),
      debts: debts.map((d) => ({ type: d.type, personName: d.personName, amount: d.amount, description: d.description, settled: d.settled, date: d.date })),
    };
  }

  async function executeAction(action: Action) {
    if (!user) return;
    switch (action.tool) {
      case "add_expense":
        await addExpense({
          userId: user.uid,
          amount: action.input.amount as number,
          category: action.input.category as string,
          description: action.input.description as string,
          date: new Date(action.input.date as string).toISOString(),
          createdAt: new Date().toISOString(),
        });
        break;
      case "set_budget":
        await setBudget(user.uid, action.input.month as string, action.input.amount as number);
        break;
      case "add_debt":
        await addDebt({
          userId: user.uid,
          type: action.input.type as "owed_to_me" | "i_owe",
          personName: action.input.personName as string,
          amount: action.input.amount as number,
          description: action.input.description as string,
          date: new Date(action.input.date as string).toISOString(),
          settled: false,
        });
        break;
      case "add_savings_goal":
        await addSavingsGoal({
          userId: user.uid,
          name: action.input.name as string,
          targetAmount: action.input.targetAmount as number,
          currentAmount: (action.input.currentAmount as number) || 0,
          deadline: new Date(action.input.deadline as string).toISOString(),
        });
        break;
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const context = await getContext();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "Something went wrong." }]);
        setLoading(false);
        return;
      }

      // Execute any actions
      const actions: Action[] = data.actions || [];
      for (const action of actions) {
        await executeAction(action);
      }

      const reply = data.text || "Done.";

      // Auto-refresh the page data after actions
      if (actions.length > 0) {
        window.dispatchEvent(new CustomEvent("expense-data-changed"));
      }

      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Failed to connect. Check your network and API key." }]);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
  <>
    {/* FLOATING BUTTON */}
    <button
      onClick={() => setOpen(!open)}
      className="fixed bottom-6 left-6 z-[60] group"
      aria-label="AI Assistant"
    >
      <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl group-hover:bg-emerald-400/30 transition-all"></div>

      <div className="relative h-14 w-14 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-all duration-300">
        {open ? (
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-[0_0_6px_rgba(52,211,153,0.5)] group-hover:drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-300"
          >
            <defs>
              <linearGradient id="aiSparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
            {/* Primary sparkle */}
            <path
              d="M12 2.5C12 2.5 12.9 8.9 15.3 11.3C17.7 13.7 23.5 14.5 23.5 14.5C23.5 14.5 17.7 15.3 15.3 17.7C12.9 20.1 12 26.5 12 26.5C12 26.5 11.1 20.1 8.7 17.7C6.3 15.3 0.5 14.5 0.5 14.5C0.5 14.5 6.3 13.7 8.7 11.3C11.1 8.9 12 2.5 12 2.5Z"
              transform="translate(0, -2.5) scale(0.85)"
              fill="url(#aiSparkleGradient)"
            />
            {/* Small accent sparkle */}
            <path
              d="M18.5 3.5C18.5 3.5 18.85 5.3 19.7 6.15C20.55 7 22.35 7.35 22.35 7.35C22.35 7.35 20.55 7.7 19.7 8.55C18.85 9.4 18.5 11.2 18.5 11.2C18.5 11.2 18.15 9.4 17.3 8.55C16.45 7.7 14.65 7.35 14.65 7.35C14.65 7.35 16.45 7 17.3 6.15C18.15 5.3 18.5 3.5 18.5 3.5Z"
              fill="url(#aiSparkleGradient)"
              opacity="0.85"
            />
          </svg>
        )}
      </div>
    </button>

    {/* CHAT PANEL */}
    {open && (
      <div className="fixed bottom-24 left-6 z-[60] w-[390px] max-h-[600px] overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f19]/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] flex flex-col">

        {/* TOP GLOW */}
        <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-r from-emerald-400/10 via-purple-500/10 to-cyan-400/10 blur-3xl pointer-events-none"></div>

        {/* HEADER */}
        <div className="relative px-5 py-4 border-b border-white/10 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 blur-md rounded-full"></div>

              <div className="relative h-11 w-11 rounded-2xl bg-linear-to-br from-emerald-400 to-purple-500 flex items-center justify-center text-sm font-bold text-black shadow-lg">
                AI
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                ExpenseAI Assistant
              </p>

              <div className="flex items-center gap-2 mt-0.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>

                <p className="text-xs text-gray-400">
                  Online • Smart finance assistant
                </p>
              </div>
            </div>
          </div>

          <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400">
            ✨
          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-[240px] max-h-[420px] scrollbar-thin scrollbar-thumb-white/10">

          {messages.length === 0 && (
            <div className="py-8 px-4">

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">

                <p className="text-white font-medium mb-4">
                  Try asking:
                </p>

                <div className="space-y-3 text-sm">

                  {[
                    "Add $50 expense for groceries",
                    "Set my budget to $2000 this month",
                    "John owes me $30 for lunch",
                    "What did I spend most on?",
                    "Show my expense ratio",
                  ].map((example, i) => (
                    <div
                      key={i}
                      className="bg-white/5 border border-white/5 rounded-xl px-3 py-2 text-gray-300 hover:bg-white/10 transition"
                    >
                      “{example}”
                    </div>
                  ))}

                </div>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >

              <div
                className={`relative max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap shadow-lg ${
                  msg.role === "user"
                    ? "bg-linear-to-r from-emerald-400 to-purple-500 text-black rounded-br-md"
                    : "bg-white/5 border border-white/10 text-gray-200 rounded-bl-md backdrop-blur-xl"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* TYPING */}
          {loading && (
            <div className="flex justify-start">

              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-md backdrop-blur-xl">

                <div className="flex gap-1.5">
                  <div
                    className="h-2 w-2 rounded-full bg-emerald-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="h-2 w-2 rounded-full bg-purple-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="h-2 w-2 rounded-full bg-cyan-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>

              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="border-t border-white/10 bg-black/20 backdrop-blur-xl p-4">

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-emerald-400/40 transition-all">

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask ExpenseAI anything..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              disabled={loading}
            />

            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="h-11 w-11 rounded-xl bg-linear-to-r from-emerald-400 to-purple-500 text-black flex items-center justify-center hover:scale-105 disabled:opacity-50 transition-all shadow-lg"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>

          </div>
        </div>
      </div>
    )}
  </>
);
}
