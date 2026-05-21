import { Expense, Debt, SavingsGoal, CATEGORIES, type Category } from "@/lib/types";
import { format, subMonths, subDays, startOfMonth, endOfMonth } from "date-fns";

// ============ TYPES ============

export interface ParsedAction {
  intent: "add_expense" | "set_budget" | "add_debt" | "add_savings_goal" | "query" | "unknown";
  params: Record<string, unknown>;
  response?: string;
}

interface FinancialContext {
  expenses: Expense[];
  budgetAmount?: number;
  savingsGoals: SavingsGoal[];
  debts: Debt[];
}

// ============ AMOUNT EXTRACTION ============

function extractAmount(text: string): number | null {
  // Matches: $200, $200.50, 200$, 200 dollars, 200.50, rs 200, inr 200
  const patterns = [
    /\$\s?([\d,]+(?:\.\d{1,2})?)/,
    /([\d,]+(?:\.\d{1,2})?)\s?\$/,
    /([\d,]+(?:\.\d{1,2})?)\s?(?:dollars?|bucks?|usd)/i,
    /(?:rs\.?|inr|rupees?)\s?([\d,]+(?:\.\d{1,2})?)/i,
    /(?:^|\s)([\d,]+(?:\.\d{1,2})?)(?:\s|$)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const val = parseFloat(m[1].replace(/,/g, ""));
      if (val > 0 && val < 10000000) return val;
    }
  }
  return null;
}

// ============ DATE EXTRACTION ============

function extractDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (/yesterday/i.test(lower)) return format(subDays(today, 1), "yyyy-MM-dd");
  if (/day before yesterday/i.test(lower)) return format(subDays(today, 2), "yyyy-MM-dd");
  if (/last week/i.test(lower)) return format(subDays(today, 7), "yyyy-MM-dd");

  // "on March 5" / "on 5th March" / "on 2026-03-05"
  const datePatterns = [
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(?:on\s+)?(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?/i,
    /(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)(?:\s*,?\s*(\d{4}))?/i,
  ];

  const m1 = lower.match(datePatterns[0]);
  if (m1) return m1[1];

  const m2 = lower.match(datePatterns[1]);
  if (m2) return `${m2[3]}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;

  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const m3 = lower.match(datePatterns[2]);
  if (m3 && months[m3[1]]) {
    const year = m3[3] || today.getFullYear().toString();
    return `${year}-${months[m3[1]]}-${m3[2].padStart(2, "0")}`;
  }

  const m4 = lower.match(datePatterns[3]);
  if (m4 && months[m4[2]]) {
    const year = m4[3] || today.getFullYear().toString();
    return `${year}-${months[m4[2]]}-${m4[1].padStart(2, "0")}`;
  }

  return format(today, "yyyy-MM-dd");
}

// ============ CATEGORY INFERENCE ============

const categoryKeywords: Record<Category, string[]> = {
  Food: ["food", "grocery", "groceries", "restaurant", "lunch", "dinner", "breakfast", "coffee", "snack", "meal", "dine", "dining", "eat", "pizza", "burger", "takeout", "takeaway", "cafe", "bakery", "drink"],
  Transport: ["uber", "lyft", "taxi", "cab", "bus", "train", "metro", "gas", "fuel", "petrol", "parking", "toll", "commute", "ride", "flight", "airline", "transport"],
  Entertainment: ["movie", "netflix", "spotify", "game", "gaming", "concert", "show", "subscription", "youtube", "hulu", "disney", "music", "party", "fun", "ticket"],
  Shopping: ["shopping", "amazon", "clothes", "clothing", "shoes", "electronics", "gadget", "phone", "laptop", "accessories", "mall", "store", "online", "purchase", "haul"],
  Bills: ["bill", "rent", "electricity", "electric", "water", "internet", "wifi", "phone bill", "insurance", "utility", "utilities", "mortgage", "payment"],
  Health: ["doctor", "hospital", "medicine", "pharmacy", "gym", "fitness", "health", "dental", "medical", "therapy", "vitamin", "clinic", "checkup"],
  Education: ["course", "book", "books", "tuition", "school", "college", "university", "class", "tutorial", "study", "education", "learning", "udemy", "coursera"],
  Travel: ["travel", "hotel", "airbnb", "flight", "vacation", "trip", "holiday", "resort", "booking", "tour"],
  Other: ["other", "misc", "miscellaneous"],
};

function inferCategory(text: string): Category {
  const lower = text.toLowerCase();
  let bestMatch: Category = "Other";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(categoryKeywords) as [Category, string[]][]) {
    for (const kw of keywords) {
      if (lower.includes(kw) && kw.length > bestScore) {
        bestMatch = cat;
        bestScore = kw.length;
      }
    }
  }
  return bestMatch;
}

// Check if user explicitly said a category
function extractExplicitCategory(text: string): Category | null {
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (lower.includes(cat.toLowerCase())) return cat;
  }
  return null;
}

// ============ PERSON NAME EXTRACTION ============

function extractPersonName(text: string): string | null {
  const patterns = [
    /(?:from|to)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/,
    /([A-Z][a-z]+)\s+(?:owes?|borrowed|lent|paid)/,
    /(?:owes?|borrowed|lent|paid)\s+(?:to|from|by)\s+([A-Z][a-z]+)/,
    /(?:give|gave|sent|send)\s+(?:to\s+)?([A-Z][a-z]+)/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  // Try lowercase patterns
  const lowerPatterns = [
    /(?:from|to)\s+(\w+)/i,
    /(\w+)\s+owes?\s+me/i,
    /i\s+owe\s+(\w+)/i,
    /(?:lent|borrowed)\s+(?:to|from)\s+(\w+)/i,
  ];
  for (const p of lowerPatterns) {
    const m = text.match(p);
    if (m) {
      const name = m[1];
      const stopWords = ["me", "my", "i", "the", "a", "an", "some", "money", "cash", "dollars", "for", "it"];
      if (!stopWords.includes(name.toLowerCase()) && name.length > 1) {
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
    }
  }
  return null;
}

// ============ DESCRIPTION EXTRACTION ============

function extractDescription(text: string, amount: number | null): string {
  let desc = text;
  // Remove amount patterns
  if (amount) desc = desc.replace(/\$\s?[\d,.]+/g, "").replace(/[\d,.]+\s?\$/g, "").replace(/[\d,.]+\s?(?:dollars?|bucks?)/gi, "");
  // Remove common command words
  desc = desc.replace(/^(add|record|log|spent|spend|paid|pay|bought|buy|purchase)\s+/i, "");
  desc = desc.replace(/\b(on|for|at|in|to|from|yesterday|today|last week)\b\s*/gi, " ");
  desc = desc.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "");
  desc = desc.trim().replace(/\s+/g, " ");
  // Capitalize
  return desc.length > 0 ? desc.charAt(0).toUpperCase() + desc.slice(1) : "Expense";
}

// ============ MONTH EXTRACTION ============

function extractMonth(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();

  if (/this month/i.test(lower)) return format(today, "yyyy-MM");
  if (/last month/i.test(lower)) return format(subMonths(today, 1), "yyyy-MM");
  if (/next month/i.test(lower)) return format(subMonths(today, -1), "yyyy-MM");

  const months: Record<string, string> = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
    jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  for (const [name, num] of Object.entries(months)) {
    if (lower.includes(name)) {
      const yearMatch = lower.match(/\b(20\d{2})\b/);
      const year = yearMatch ? yearMatch[1] : today.getFullYear().toString();
      return `${year}-${num}`;
    }
  }

  return format(today, "yyyy-MM");
}

// ============ INTENT DETECTION ============

function detectIntent(text: string): ParsedAction["intent"] {
  const lower = text.toLowerCase();

  // Query patterns — check FIRST (questions take priority)
  const queryPatterns = [
    /^(what|how much|how many|show|tell|where|which|when|do i|can i|am i|is my|are my)/i,
    /\?$/,
    /\b(total|ratio|compare|average|breakdown|remaining|balance|status|summary|overview|report|trend|analyze)\b/i,
    /\b(highest|lowest|most|least|biggest|smallest|top|maximum|minimum)\b/i,
    /\bhow.*doing\b/i,
    /\bwho.*owe/i,
    /\bover.*budget|under.*budget|within.*budget|budget.*status/i,
    /\bhow much.*(left|spent|remaining|owe)/i,
    /\bcan i afford\b/i,
    /\blast.*expense|recent.*expense|latest.*expense/i,
  ];
  if (queryPatterns.some((p) => p.test(lower))) return "query";

  // Debt patterns — check before expense (both can have "spent"/"paid")
  if (/\b(owes?\s+me|i\s+owe|lent\s+(to|money)|borrowed\s+from|loan\s+to)\b/i.test(lower)) return "add_debt";

  // Budget patterns
  if (/\b(set|update|change|make)\s+(my\s+)?budget\b/i.test(lower)) return "set_budget";
  if (/\bbudget\b.*\$|budget\b.*\d/i.test(lower) && /\bset|make|put|update\b/i.test(lower)) return "set_budget";

  // Savings goal patterns
  if (/\b(savings?\s+goal|save\s+for|saving\s+for|create\s+.*goal|start\s+.*goal)\b/i.test(lower)) return "add_savings_goal";

  // Expense patterns — action words that imply adding
  if (/\b(add|record|log|paid|pay|bought|buy|purchase)\b/i.test(lower)) return "add_expense";
  // "spent $50 on X" (action) vs "how much spent" (query - already caught above)
  if (/\bspent?\b/i.test(lower) && extractAmount(text)) return "add_expense";

  // If it has an amount and an action-like structure, assume expense
  if (extractAmount(text) && /\b(for|on|at)\b/i.test(lower)) return "add_expense";

  return "unknown";
}

// ============ RECEIPT / PASTED-TEXT PARSER ============

export interface ParsedReceipt {
  amount: number | null;
  category: Category;
  date: string;
  description: string;
  rawText: string;
}

// Look for the receipt total. Receipts usually print "Total", "Grand Total",
// "Amount Due", "Amount Paid" etc. on a line with the final figure. If we can't
// find a labeled total, fall back to the largest plausible amount on the receipt.
function extractReceiptTotal(text: string): number | null {
  const lines = text.split(/\r?\n/);
  const totalLabels = /\b(grand\s*total|total\s*amount|amount\s*due|amount\s*paid|total\s*paid|total|balance\s*due|net\s*total|payable)\b/i;
  const skipLabels = /\b(sub\s*total|subtotal|tax|gst|vat|tip|discount|change|cash|tendered)\b/i;

  // Pass 1: find the labeled total. Prefer "grand total" when present.
  let bestLabeled: { score: number; amount: number } | null = null;
  for (const line of lines) {
    if (skipLabels.test(line) && !/grand\s*total/i.test(line)) continue;
    if (!totalLabels.test(line)) continue;
    const amounts = [...line.matchAll(/([\d,]+\.\d{2})|(\d+)\s*$/g)]
      .map((m) => parseFloat((m[1] || m[2] || "").replace(/,/g, "")))
      .filter((n) => !isNaN(n) && n > 0 && n < 10000000);
    if (amounts.length === 0) continue;
    const amount = Math.max(...amounts);
    const score = /grand\s*total|amount\s*due|amount\s*paid|balance\s*due/i.test(line) ? 2 : 1;
    if (!bestLabeled || score > bestLabeled.score || (score === bestLabeled.score && amount > bestLabeled.amount)) {
      bestLabeled = { score, amount };
    }
  }
  if (bestLabeled) return bestLabeled.amount;

  // Pass 2: largest currency-like amount in the body.
  const allAmounts: number[] = [];
  const re = /([\d,]+\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1].replace(/,/g, ""));
    if (!isNaN(v) && v > 0 && v < 10000000) allAmounts.push(v);
  }
  if (allAmounts.length > 0) return Math.max(...allAmounts);

  return extractAmount(text);
}

function extractReceiptDescription(text: string): string {
  // First non-empty, non-numeric line is usually the merchant name.
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    const stripped = line.replace(/[^A-Za-z\s&'.-]/g, "").trim();
    if (stripped.length >= 3 && /[A-Za-z]/.test(stripped) && !/receipt|invoice|bill|tax|gst|order|store/i.test(stripped)) {
      // Title-case the merchant a bit
      return stripped.replace(/\s+/g, " ").slice(0, 60);
    }
  }
  return "Expense";
}

export function parseReceiptText(text: string): ParsedReceipt {
  const cleaned = text.trim();
  const amount = extractReceiptTotal(cleaned);
  const date = extractDate(cleaned);
  const description = extractReceiptDescription(cleaned);
  const category = extractExplicitCategory(cleaned) || inferCategory(cleaned);
  return { amount, category, date, description, rawText: cleaned };
}

// ============ MAIN PARSER ============

export function parseMessage(text: string, ctx: FinancialContext): ParsedAction {
  const intent = detectIntent(text);

  switch (intent) {
    case "add_expense": {
      const amount = extractAmount(text);
      if (!amount) return { intent: "unknown", params: {}, response: "I couldn't find an amount. Try: \"Add $50 for groceries\"" };
      const category = extractExplicitCategory(text) || inferCategory(text);
      const date = extractDate(text);
      const description = extractDescription(text, amount);
      return {
        intent: "add_expense",
        params: { amount, category, date, description },
        response: `Added $${amount.toFixed(2)} expense for "${description}" (${category}) on ${date}.`,
      };
    }

    case "set_budget": {
      const amount = extractAmount(text);
      if (!amount) return { intent: "unknown", params: {}, response: "I couldn't find a budget amount. Try: \"Set budget to $2000\"" };
      const month = extractMonth(text);
      return {
        intent: "set_budget",
        params: { amount, month },
        response: `Set budget to $${amount.toFixed(2)} for ${format(new Date(month + "-01"), "MMMM yyyy")}.`,
      };
    }

    case "add_debt": {
      const amount = extractAmount(text);
      if (!amount) return { intent: "unknown", params: {}, response: "I couldn't find an amount. Try: \"John owes me $50 for lunch\"" };
      const lower = text.toLowerCase();
      const isOwedToMe = /owes?\s+me|lent\s+to|lent\s+\w+/i.test(lower);
      const type = isOwedToMe ? "owed_to_me" : "i_owe";
      const personName = extractPersonName(text) || "Someone";
      const date = extractDate(text);
      const description = extractDescription(text, amount);
      return {
        intent: "add_debt",
        params: { type, personName, amount, description, date },
        response: `Added: ${type === "owed_to_me" ? `${personName} owes you` : `You owe ${personName}`} $${amount.toFixed(2)} — "${description}".`,
      };
    }

    case "add_savings_goal": {
      const amount = extractAmount(text);
      if (!amount) return { intent: "unknown", params: {}, response: "I couldn't find a target amount. Try: \"Create vacation goal for $5000 by December\"" };
      // Extract goal name
      const nameMatch = text.match(/(?:for|called|named)\s+(.+?)(?:\s+(?:of|for|by|with|\$|goal))/i);
      const name = nameMatch ? nameMatch[1].trim() : "Savings Goal";
      const deadlineMatch = text.match(/by\s+(.+?)(?:\s*$)/i);
      let deadline = format(subMonths(new Date(), -6), "yyyy-MM-dd"); // default 6 months
      if (deadlineMatch) {
        const parsed = extractDate("on " + deadlineMatch[1]);
        if (parsed !== format(new Date(), "yyyy-MM-dd")) deadline = parsed;
      }
      return {
        intent: "add_savings_goal",
        params: { name, targetAmount: amount, currentAmount: 0, deadline },
        response: `Created savings goal "${name}" — target $${amount.toFixed(2)} by ${deadline}.`,
      };
    }

    case "query":
      return {
        intent: "query",
        params: {},
        response: answerQuery(text, ctx),
      };

    default:
      return {
        intent: "unknown",
        params: {},
        response: "I didn't understand that. Try:\n• \"Add $50 for groceries\"\n• \"Set budget to $2000\"\n• \"John owes me $30 for lunch\"\n• \"What did I spend most on?\"",
      };
  }
}

// ============ QUERY ENGINE ============

function answerQuery(text: string, ctx: FinancialContext): string {
  const lower = text.toLowerCase();
  const { expenses, budgetAmount, savingsGoals, debts } = ctx;
  const today = new Date();
  const currentMonthStr = format(today, "yyyy-MM");

  // Determine which month the query is about
  const queryMonth = extractMonth(text);
  const monthStart = startOfMonth(new Date(queryMonth + "-01"));
  const monthEnd = endOfMonth(new Date(queryMonth + "-01"));
  const monthLabel = format(monthStart, "MMMM yyyy");
  const monthExpenses = expenses.filter((e) => { const d = new Date(e.date); return d >= monthStart && d <= monthEnd; });
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown for the month
  const catTotals: Record<string, number> = {};
  monthExpenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // Helper for budget answers
  const hasBudget = !!budgetAmount;
  const budgetRemaining = hasBudget ? budgetAmount! - monthTotal : 0;
  const budgetPct = hasBudget ? (monthTotal / budgetAmount!) * 100 : 0;
  const isOverBudget = hasBudget && monthTotal > budgetAmount!;

  // --- BUDGET: over/under/exceed/within ---
  if (/over\s*(my\s+)?budget|exceed|exceeded|above\s*budget|gone\s*over/i.test(lower)) {
    if (!hasBudget) return `No budget set for ${monthLabel}. Set one with "Set budget to $2000".`;
    if (isOverBudget) {
      return `You are $${Math.abs(budgetRemaining).toFixed(2)} over your $${budgetAmount!.toFixed(2)} budget in ${monthLabel}.\nTotal spent: $${monthTotal.toFixed(2)} (${budgetPct.toFixed(1)}% of budget).`;
    }
    return `You're within budget! $${budgetRemaining.toFixed(2)} remaining from your $${budgetAmount!.toFixed(2)} budget in ${monthLabel}.`;
  }

  // --- BUDGET: under/within/on track ---
  if (/under\s*(my\s+)?budget|within\s*budget|on\s*track|budget\s*status/i.test(lower)) {
    if (!hasBudget) return `No budget set for ${monthLabel}.`;
    if (isOverBudget) {
      return `No — you're $${Math.abs(budgetRemaining).toFixed(2)} over budget. Spent $${monthTotal.toFixed(2)} of $${budgetAmount!.toFixed(2)}.`;
    }
    return `Yes, you're within budget. $${budgetRemaining.toFixed(2)} remaining ($${monthTotal.toFixed(2)} of $${budgetAmount!.toFixed(2)} used, ${budgetPct.toFixed(1)}%).`;
  }

  // --- BUDGET: how much left / remaining / can I spend ---
  if (/(?:how much|what).*(?:left|remaining|still have|can i spend|available)|budget.*left|left.*budget/i.test(lower)) {
    if (!hasBudget) return `No budget set for ${monthLabel}.`;
    if (isOverBudget) {
      return `Nothing left — you're $${Math.abs(budgetRemaining).toFixed(2)} over your $${budgetAmount!.toFixed(2)} budget.`;
    }
    const daysLeft = queryMonth === currentMonthStr
      ? new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate()
      : 0;
    const perDay = daysLeft > 0 ? budgetRemaining / daysLeft : 0;
    return `You have $${budgetRemaining.toFixed(2)} left from your $${budgetAmount!.toFixed(2)} budget.${daysLeft > 0 ? `\nThat's $${perDay.toFixed(2)}/day for the remaining ${daysLeft} days.` : ""}`;
  }

  // --- BUDGET: ratio / percent / usage ---
  if (/ratio|budget.*percent|percent.*budget|budget.*usage|usage.*budget|how much.*budget.*used|used.*budget/i.test(lower)) {
    if (!hasBudget) return `No budget set for ${monthLabel}. Set one first.`;
    return `Your expense-to-budget ratio for ${monthLabel} is ${budgetPct.toFixed(1)}%.\nSpent: $${monthTotal.toFixed(2)} / Budget: $${budgetAmount!.toFixed(2)}\nRemaining: $${budgetRemaining.toFixed(2)}`;
  }

  // --- BUDGET: what is my budget ---
  if (/(?:what|how much).*(?:is|was)\s+(?:my\s+)?budget/i.test(lower)) {
    if (!hasBudget) return `No budget set for ${monthLabel}.`;
    return `Your budget for ${monthLabel} is $${budgetAmount!.toFixed(2)}. You've spent $${monthTotal.toFixed(2)} (${budgetPct.toFixed(1)}%).`;
  }

  // --- TOTAL SPENDING ---
  if (/total\s*(spend|spent|expense)|how much.*spend|how much.*spent|total.*this month|this month.*total/i.test(lower)) {
    if (lower.includes("all time") || lower.includes("overall") || lower.includes("total expenses") || lower.includes("ever")) {
      return `Total expenses (all time): $${allTotal.toFixed(2)} across ${expenses.length} transactions.`;
    }
    return `Total spent in ${monthLabel}: $${monthTotal.toFixed(2)} across ${monthExpenses.length} transactions.`;
  }

  // --- MOST/HIGHEST category ---
  if ((/most|highest|top|biggest|maximum|max/i.test(lower)) && (/categ|spend|spent|on|money|where/i.test(lower))) {
    if (sortedCats.length === 0) return `No expenses found for ${monthLabel}.`;
    const [topCat, topAmt] = sortedCats[0];
    const pct = monthTotal > 0 ? ((topAmt / monthTotal) * 100).toFixed(1) : "0";
    let response = `Highest spending category in ${monthLabel}: ${topCat} at $${topAmt.toFixed(2)} (${pct}% of total).`;
    if (sortedCats.length > 1) {
      response += `\nFollowed by: ${sortedCats.slice(1, 3).map(([c, a]) => `${c} ($${a.toFixed(2)})`).join(", ")}.`;
    }
    return response;
  }

  // --- LEAST/LOWEST category ---
  if ((/least|lowest|smallest|minimum|min/i.test(lower)) && (/categ|spend|spent|on|money/i.test(lower))) {
    if (sortedCats.length === 0) return `No expenses found for ${monthLabel}.`;
    const [lowCat, lowAmt] = sortedCats[sortedCats.length - 1];
    return `Lowest spending category in ${monthLabel}: ${lowCat} at $${lowAmt.toFixed(2)}.`;
  }

  // --- WHERE DOES MY MONEY GO / breakdown ---
  if (/breakdown|by category|categories|split|where.*money.*go|where.*spend|spending.*distribution/i.test(lower)) {
    if (sortedCats.length === 0) return `No expenses found for ${monthLabel}.`;
    const lines = sortedCats.map(([cat, amt]) => `• ${cat}: $${amt.toFixed(2)} (${((amt / monthTotal) * 100).toFixed(1)}%)`);
    return `Category breakdown for ${monthLabel} ($${monthTotal.toFixed(2)} total):\n${lines.join("\n")}`;
  }

  // --- REMAINING budget (broader) ---
  if (/remaining|left over|balance/i.test(lower) && /budget/i.test(lower)) {
    if (!hasBudget) return "No budget set for this month.";
    return isOverBudget
      ? `You're $${Math.abs(budgetRemaining).toFixed(2)} over your $${budgetAmount!.toFixed(2)} budget.`
      : `You have $${budgetRemaining.toFixed(2)} remaining from your $${budgetAmount!.toFixed(2)} budget.`;
  }

  // --- DEBTS (broader patterns) ---
  if (/debt|owe|owed|lent|borrowed|collection|who.*money|money.*who|pending.*payment/i.test(lower)) {
    const active = debts.filter((d) => !d.settled);
    if (active.length === 0) return "You have no active debts or collections.";
    const owedToMe = active.filter((d) => d.type === "owed_to_me");
    const iOwe = active.filter((d) => d.type === "i_owe");
    const owedToMeTotal = owedToMe.reduce((s, d) => s + d.amount, 0);
    const iOweTotal = iOwe.reduce((s, d) => s + d.amount, 0);

    // Specific sub-queries
    if (/who.*owe.*me|owed.*to.*me|people.*owe|money.*collect/i.test(lower)) {
      if (owedToMe.length === 0) return "No one owes you money right now.";
      const lines = owedToMe.map((d) => `• ${d.personName}: $${d.amount.toFixed(2)} — ${d.description}`);
      return `People who owe you ($${owedToMeTotal.toFixed(2)} total):\n${lines.join("\n")}`;
    }
    if (/who.*i.*owe|what.*i.*owe|do i owe|my.*debt/i.test(lower)) {
      if (iOwe.length === 0) return "You don't owe anyone right now.";
      const lines = iOwe.map((d) => `• ${d.personName}: $${d.amount.toFixed(2)} — ${d.description}`);
      return `You owe ($${iOweTotal.toFixed(2)} total):\n${lines.join("\n")}`;
    }

    const lines = active.map((d) => `• ${d.type === "owed_to_me" ? `${d.personName} owes you` : `You owe ${d.personName}`}: $${d.amount.toFixed(2)}`);
    return `Active debts (${active.length}):\n${lines.join("\n")}\n\nOwed to you: $${owedToMeTotal.toFixed(2)}\nYou owe: $${iOweTotal.toFixed(2)}\nNet: ${(owedToMeTotal - iOweTotal) >= 0 ? "+" : ""}$${(owedToMeTotal - iOweTotal).toFixed(2)}`;
  }

  // --- SAVINGS ---
  if (/saving|goal|saved|progress.*goal/i.test(lower)) {
    if (savingsGoals.length === 0) return "No savings goals set. Create one with \"Create vacation goal for $5000 by December\".";
    const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const totalTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const lines = savingsGoals.map((g) => {
      const pct = ((g.currentAmount / g.targetAmount) * 100).toFixed(0);
      const remaining = g.targetAmount - g.currentAmount;
      return `• ${g.name}: $${g.currentAmount.toFixed(2)} / $${g.targetAmount.toFixed(2)} (${pct}%) — $${remaining.toFixed(2)} to go`;
    });
    return `Savings goals (${savingsGoals.length}):\n${lines.join("\n")}\n\nTotal saved: $${totalSaved.toFixed(2)} / $${totalTarget.toFixed(2)}`;
  }

  // --- AVERAGE / DAILY ---
  if (/average|daily|per day/i.test(lower)) {
    const daysInMonth = queryMonth === currentMonthStr ? today.getDate() : endOfMonth(monthStart).getDate();
    const avg = daysInMonth > 0 ? monthTotal / daysInMonth : 0;
    return `Average daily spending in ${monthLabel}: $${avg.toFixed(2)} ($${monthTotal.toFixed(2)} over ${daysInMonth} days).`;
  }

  // --- WEEKLY average ---
  if (/weekly|per week/i.test(lower)) {
    const weeks = Math.max(1, monthExpenses.length > 0 ? Math.ceil((new Date(monthExpenses[0].date).getDate()) / 7) : 1);
    const avg = monthTotal / weeks;
    return `Average weekly spending in ${monthLabel}: $${avg.toFixed(2)}.`;
  }

  // --- TRANSACTION COUNT ---
  if (/how many.*transaction|how many.*expense|count|number of/i.test(lower)) {
    return `You have ${monthExpenses.length} transactions in ${monthLabel} totaling $${monthTotal.toFixed(2)}.`;
  }

  // --- COMPARE months ---
  if (/compare|vs|versus|difference.*month|month.*difference|last month.*this month|this month.*last month/i.test(lower)) {
    const lastMonthStr = format(subMonths(today, 1), "yyyy-MM");
    const lastStart = startOfMonth(new Date(lastMonthStr + "-01"));
    const lastEnd = endOfMonth(new Date(lastMonthStr + "-01"));
    const lastExpenses = expenses.filter((e) => { const d = new Date(e.date); return d >= lastStart && d <= lastEnd; });
    const lastTotal = lastExpenses.reduce((s, e) => s + e.amount, 0);
    const diff = monthTotal - lastTotal;
    const pctChange = lastTotal > 0 ? ((diff / lastTotal) * 100).toFixed(1) : "N/A";
    return `${format(monthStart, "MMMM")}: $${monthTotal.toFixed(2)} (${monthExpenses.length} transactions)\n${format(lastStart, "MMMM")}: $${lastTotal.toFixed(2)} (${lastExpenses.length} transactions)\nDifference: ${diff >= 0 ? "+" : ""}$${diff.toFixed(2)} (${pctChange}%)`;
  }

  // --- LAST / RECENT expenses ---
  if (/last|recent|latest/i.test(lower) && /expense|transaction|purchase|entry/i.test(lower)) {
    const count = 5;
    const recent = monthExpenses.slice(0, count);
    if (recent.length === 0) return `No expenses in ${monthLabel}.`;
    const lines = recent.map((e) => `• ${format(new Date(e.date), "MMM d")}: $${e.amount.toFixed(2)} — ${e.description} (${e.category})`);
    return `Last ${recent.length} expenses:\n${lines.join("\n")}`;
  }

  // --- EXPENSIVE single transaction ---
  if (/(?:most|biggest|largest|highest).*(?:expense|transaction|purchase|single)/i.test(lower)) {
    if (monthExpenses.length === 0) return `No expenses in ${monthLabel}.`;
    const biggest = [...monthExpenses].sort((a, b) => b.amount - a.amount)[0];
    return `Biggest expense in ${monthLabel}: $${biggest.amount.toFixed(2)} — "${biggest.description}" (${biggest.category}) on ${format(new Date(biggest.date), "MMM d")}.`;
  }

  // --- CHEAPEST single transaction ---
  if (/(?:cheapest|smallest|lowest|least).*(?:expense|transaction|purchase|single)/i.test(lower)) {
    if (monthExpenses.length === 0) return `No expenses in ${monthLabel}.`;
    const smallest = [...monthExpenses].sort((a, b) => a.amount - b.amount)[0];
    return `Smallest expense in ${monthLabel}: $${smallest.amount.toFixed(2)} — "${smallest.description}" (${smallest.category}) on ${format(new Date(smallest.date), "MMM d")}.`;
  }

  // --- CAN I AFFORD / do I have enough ---
  if (/can i (?:afford|buy|spend)|do i have enough|is there enough/i.test(lower)) {
    const wantAmount = extractAmount(text);
    if (!wantAmount) return "Tell me the amount — e.g. \"Can I afford $200?\"";
    if (!hasBudget) return `No budget set. But you've spent $${monthTotal.toFixed(2)} this month so far.`;
    if (budgetRemaining >= wantAmount) {
      return `Yes, you can. You have $${budgetRemaining.toFixed(2)} remaining in your budget, and $${wantAmount.toFixed(2)} would leave you with $${(budgetRemaining - wantAmount).toFixed(2)}.`;
    }
    return `That's tight. You only have $${budgetRemaining.toFixed(2)} left in your budget. Spending $${wantAmount.toFixed(2)} would put you $${(wantAmount - budgetRemaining).toFixed(2)} over budget.`;
  }

  // --- SUMMARY / overview / how am I doing ---
  if (/summary|overview|how am i|how.*doing|status|report/i.test(lower)) {
    const lines = [`${monthLabel} Summary:`, `• Total spent: $${monthTotal.toFixed(2)} (${monthExpenses.length} transactions)`];
    if (hasBudget) {
      lines.push(`• Budget: $${budgetAmount!.toFixed(2)} (${budgetPct.toFixed(1)}% used, $${Math.abs(budgetRemaining).toFixed(2)} ${isOverBudget ? "over" : "remaining"})`);
    }
    if (sortedCats.length > 0) lines.push(`• Top category: ${sortedCats[0][0]} ($${sortedCats[0][1].toFixed(2)})`);
    if (debts.filter((d) => !d.settled).length > 0) {
      const activeDebts = debts.filter((d) => !d.settled);
      const net = activeDebts.filter((d) => d.type === "owed_to_me").reduce((s, d) => s + d.amount, 0) - activeDebts.filter((d) => d.type === "i_owe").reduce((s, d) => s + d.amount, 0);
      lines.push(`• Active debts: ${activeDebts.length} (net: ${net >= 0 ? "+" : ""}$${net.toFixed(2)})`);
    }
    if (savingsGoals.length > 0) {
      const totalSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
      lines.push(`• Savings: $${totalSaved.toFixed(2)} across ${savingsGoals.length} goals`);
    }
    return lines.join("\n");
  }

  // --- Specific category query ---
  for (const cat of CATEGORIES) {
    if (lower.includes(cat.toLowerCase())) {
      const catAmount = catTotals[cat] || 0;
      const catCount = monthExpenses.filter((e) => e.category === cat).length;
      if (catCount === 0) return `No ${cat} expenses in ${monthLabel}.`;
      const catPct = monthTotal > 0 ? ((catAmount / monthTotal) * 100).toFixed(1) : "0";
      return `${cat} in ${monthLabel}: $${catAmount.toFixed(2)} across ${catCount} transactions (${catPct}% of total spending).`;
    }
  }

  // --- Fallback: give summary ---
  return `Here's your ${monthLabel} summary:\n• Total spent: $${monthTotal.toFixed(2)} (${monthExpenses.length} transactions)\n${budgetAmount ? `• Budget: $${budgetAmount.toFixed(2)} (${((monthTotal / budgetAmount) * 100).toFixed(1)}% used)\n` : ""}${sortedCats.length > 0 ? `• Top category: ${sortedCats[0][0]} ($${sortedCats[0][1].toFixed(2)})\n` : ""}• All-time total: $${allTotal.toFixed(2)}`;
}