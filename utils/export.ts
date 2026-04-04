import { Expense, Budget, SavingsGoal, Debt } from "@/lib/types";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

// ---------- Excel Export ----------

export function exportExpensesToExcel(expenses: Expense[], fileName?: string) {
  const data = expenses.map((e) => ({
    Date: format(new Date(e.date), "yyyy-MM-dd"),
    Description: e.description,
    Category: e.category,
    Amount: e.amount,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");
  XLSX.writeFile(wb, fileName || `expenses_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

export function exportFullReportExcel(
  expenses: Expense[],
  budget: Budget | null,
  savingsGoals: SavingsGoal[],
  debts: Debt[]
) {
  const wb = XLSX.utils.book_new();

  // Expenses sheet
  const expData = expenses.map((e) => ({
    Date: format(new Date(e.date), "yyyy-MM-dd"),
    Description: e.description,
    Category: e.category,
    Amount: e.amount,
  }));
  const wsExp = XLSX.utils.json_to_sheet(expData);
  wsExp["!cols"] = [{ wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsExp, "Expenses");

  // Budget sheet
  const totalSpent = expenses
    .filter((e) => e.date.startsWith(format(new Date(), "yyyy-MM")))
    .reduce((s, e) => s + e.amount, 0);
  const budgetData = [{
    Month: format(new Date(), "MMMM yyyy"),
    Budget: budget?.amount ?? "Not set",
    Spent: totalSpent,
    Remaining: budget ? budget.amount - totalSpent : "N/A",
    "Usage %": budget ? `${((totalSpent / budget.amount) * 100).toFixed(1)}%` : "N/A",
  }];
  const wsBud = XLSX.utils.json_to_sheet(budgetData);
  wsBud["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsBud, "Budget");

  // Savings sheet
  if (savingsGoals.length > 0) {
    const savData = savingsGoals.map((g) => ({
      Goal: g.name,
      Target: g.targetAmount,
      Saved: g.currentAmount,
      Remaining: g.targetAmount - g.currentAmount,
      "Progress %": `${((g.currentAmount / g.targetAmount) * 100).toFixed(1)}%`,
      Deadline: format(new Date(g.deadline), "yyyy-MM-dd"),
    }));
    const wsSav = XLSX.utils.json_to_sheet(savData);
    wsSav["!cols"] = [{ wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSav, "Savings");
  }

  // Debts sheet
  if (debts.length > 0) {
    const debtData = debts.map((d) => ({
      Type: d.type === "owed_to_me" ? "They Owe Me" : "I Owe",
      Person: d.personName,
      Amount: d.amount,
      Description: d.description,
      Date: format(new Date(d.date), "yyyy-MM-dd"),
      Status: d.settled ? "Settled" : "Active",
    }));
    const wsDebt = XLSX.utils.json_to_sheet(debtData);
    wsDebt["!cols"] = [{ wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, wsDebt, "Debts");
  }

  // Category summary sheet
  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catData = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, total]) => ({ Category: cat, Total: total, Transactions: expenses.filter((e) => e.category === cat).length }));
  const wsCat = XLSX.utils.json_to_sheet(catData);
  wsCat["!cols"] = [{ wch: 15 }, { wch: 12 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsCat, "Category Summary");

  XLSX.writeFile(wb, `expense_report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

// ---------- PDF Export ----------

export function exportExpensesToPDF(expenses: Expense[], fileName?: string) {
  const doc = new jsPDF();
  const now = format(new Date(), "MMMM dd, yyyy");

  // Header
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // indigo
  doc.text("ExpenseAI", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Expense Report — Generated ${now}`, 14, 28);

  // Line
  doc.setDrawColor(229, 231, 235);
  doc.line(14, 32, 196, 32);

  // Summary
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Total Expenses: $${total.toFixed(2)}`, 14, 40);
  doc.text(`Transactions: ${expenses.length}`, 14, 47);

  // Table
  autoTable(doc, {
    startY: 54,
    head: [["Date", "Description", "Category", "Amount"]],
    body: expenses.map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      e.description,
      e.category,
      `$${e.amount.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  doc.save(fileName || `expenses_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export function exportFullReportPDF(
  expenses: Expense[],
  budget: Budget | null,
  savingsGoals: SavingsGoal[],
  debts: Debt[]
) {
  const doc = new jsPDF();
  const now = format(new Date(), "MMMM dd, yyyy");
  const currentMonth = format(new Date(), "MMMM yyyy");
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text("ExpenseAI", 14, y);
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text("Financial Report", 14, y + 8);
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(`Generated on ${now}`, 14, y + 14);
  doc.setDrawColor(229, 231, 235);
  doc.line(14, y + 18, 196, y + 18);
  y += 26;

  // Budget summary
  const monthExpenses = expenses.filter((e) => e.date.startsWith(format(new Date(), "yyyy-MM")));
  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const allTotal = expenses.reduce((s, e) => s + e.amount, 0);

  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text(`Overview — ${currentMonth}`, 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.text(`Total Expenses (All Time): $${allTotal.toFixed(2)} (${expenses.length} transactions)`, 14, y); y += 6;
  doc.text(`This Month: $${monthTotal.toFixed(2)} (${monthExpenses.length} transactions)`, 14, y); y += 6;
  if (budget) {
    const pct = ((monthTotal / budget.amount) * 100).toFixed(1);
    doc.text(`Budget: $${budget.amount.toFixed(2)} | Spent: ${pct}% | Remaining: $${(budget.amount - monthTotal).toFixed(2)}`, 14, y);
    y += 6;
  }
  y += 4;

  // Expenses table
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("Expenses", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Date", "Description", "Category", "Amount"]],
    body: expenses.slice(0, 50).map((e) => [
      format(new Date(e.date), "yyyy-MM-dd"),
      e.description.length > 30 ? e.description.slice(0, 30) + "..." : e.description,
      e.category,
      `$${e.amount.toFixed(2)}`,
    ]),
    headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 3: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  // Category breakdown on new page
  doc.addPage();
  y = 20;

  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  doc.setFontSize(13);
  doc.text("Category Breakdown", 14, y);
  y += 2;
  autoTable(doc, {
    startY: y,
    head: [["Category", "Total", "% of Spending", "Transactions"]],
    body: catEntries.map(([cat, total]) => [
      cat,
      `$${total.toFixed(2)}`,
      `${((total / allTotal) * 100).toFixed(1)}%`,
      expenses.filter((e) => e.category === cat).length.toString(),
    ]),
    headStyles: { fillColor: [79, 70, 229], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    margin: { left: 14, right: 14 },
  });

  // Savings goals
  if (savingsGoals.length > 0) {
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80;
    y += 12;
    doc.setFontSize(13);
    doc.text("Savings Goals", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Goal", "Target", "Saved", "Progress", "Deadline"]],
      body: savingsGoals.map((g) => [
        g.name,
        `$${g.targetAmount.toFixed(2)}`,
        `$${g.currentAmount.toFixed(2)}`,
        `${((g.currentAmount / g.targetAmount) * 100).toFixed(1)}%`,
        format(new Date(g.deadline), "yyyy-MM-dd"),
      ]),
      headStyles: { fillColor: [34, 197, 94], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  // Debts
  const activeDebts = debts.filter((d) => !d.settled);
  if (activeDebts.length > 0) {
    y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;
    y += 12;
    doc.setFontSize(13);
    doc.text("Active Debts", 14, y);
    y += 2;
    autoTable(doc, {
      startY: y,
      head: [["Type", "Person", "Amount", "Description", "Date"]],
      body: activeDebts.map((d) => [
        d.type === "owed_to_me" ? "They Owe Me" : "I Owe",
        d.personName,
        `$${d.amount.toFixed(2)}`,
        d.description,
        format(new Date(d.date), "yyyy-MM-dd"),
      ]),
      headStyles: { fillColor: [239, 68, 68], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.save(`financial_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
