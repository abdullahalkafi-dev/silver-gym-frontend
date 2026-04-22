// types/expense.ts
// Re-exports from the canonical expense types file.
// Use @/types/expense-category for all new code.
export type {
  ExpensePaymentMethod,
  ExpenseCategory,
  ExpenseSubcategory,
  Expense,
  ExpenseHistory,
} from "@/types/expense-category";
