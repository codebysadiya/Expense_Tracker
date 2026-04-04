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
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-6 z-[60] h-12 w-12 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center"
        aria-label="AI Assistant"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 left-6 z-[60] w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-indigo-600 text-white flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">AI</div>
            <div>
              <p className="text-sm font-semibold">ExpenseAI Assistant</p>
              <p className="text-xs text-indigo-200">Ask anything or give commands</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[360px]">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-xs py-8 space-y-2">
                <p className="font-medium text-gray-500">Try saying:</p>
                <p>&quot;Add $50 expense for groceries&quot;</p>
                <p>&quot;Set my budget to $2000 this month&quot;</p>
                <p>&quot;John owes me $30 for lunch&quot;</p>
                <p>&quot;What did I spend most on this month?&quot;</p>
                <p>&quot;What is my expense to budget ratio?&quot;</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
