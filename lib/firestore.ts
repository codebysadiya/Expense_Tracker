import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Expense, Budget, SavingsGoal, Debt } from "./types";

// --- Expenses ---

export async function getExpenses(userId: string): Promise<Expense[]> {
  const q = query(
    collection(db, "expenses"),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  const expenses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));
  return expenses.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addExpense(expense: Omit<Expense, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "expenses"), expense);
  return docRef.id;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  await updateDoc(doc(db, "expenses", id), data);
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDoc(doc(db, "expenses", id));
}

// --- Budget ---

export async function getBudget(userId: string, month: string): Promise<Budget | null> {
  const docRef = doc(db, "budgets", `${userId}_${month}`);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() } as Budget;
  }
  return null;
}

export async function setBudget(userId: string, month: string, amount: number): Promise<void> {
  const docRef = doc(db, "budgets", `${userId}_${month}`);
  await setDoc(docRef, { userId, month, amount });
}

export async function getAllBudgets(userId: string): Promise<Budget[]> {
  const q = query(collection(db, "budgets"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
}

// --- Savings Goals ---

export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const q = query(collection(db, "savingsGoals"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as SavingsGoal));
}

export async function addSavingsGoal(goal: Omit<SavingsGoal, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "savingsGoals"), goal);
  return docRef.id;
}

export async function updateSavingsGoal(id: string, data: Partial<SavingsGoal>): Promise<void> {
  await updateDoc(doc(db, "savingsGoals", id), data);
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, "savingsGoals", id));
}

// --- Debts ---

export async function getDebts(userId: string): Promise<Debt[]> {
  const q = query(collection(db, "debts"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const debts = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Debt));
  return debts.sort((a, b) => b.date.localeCompare(a.date));
}

export async function addDebt(debt: Omit<Debt, "id">): Promise<string> {
  const docRef = await addDoc(collection(db, "debts"), debt);
  return docRef.id;
}

export async function updateDebt(id: string, data: Partial<Debt>): Promise<void> {
  await updateDoc(doc(db, "debts", id), data);
}

export async function deleteDebt(id: string): Promise<void> {
  await deleteDoc(doc(db, "debts", id));
}
