export interface Expense {
  id: string;
  userId: string;
  amount: number;
  category: string;
  date: string; // ISO string
  description: string;
  createdAt: string;
}

export interface Budget {
  id: string;
  userId: string;
  amount: number;
  month: string; // "YYYY-MM"
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

export interface Debt {
  id: string;
  userId: string;
  type: "owed_to_me" | "i_owe";
  personName: string;
  amount: number;
  description: string;
  date: string;
  settled: boolean;
  settledDate?: string;
}

export interface Insight {
  type: "info" | "warning" | "success" | "anomaly";
  message: string;
  category?: string;
}

export const CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Bills",
  "Health",
  "Education",
  "Travel",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
