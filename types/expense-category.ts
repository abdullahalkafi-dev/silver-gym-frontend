export type ExpensePaymentMethod = "cash" | "bank_transfer" | "bkash" | "due";

export interface ExpenseSubcategory {
  id: string;
  categoryId: string;
  title: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseCategory {
  id: string;
  branchId?: string;
  title: string;
  description?: string;
  color?: string;
  isActive?: boolean;
  subcategories: ExpenseSubcategory[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  branchId: string;
  subcategoryId: string;
  subcategoryTitle: string;
  categoryId?: string;
  categoryTitle: string;
  invoiceNo: string;
  description?: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  expenseDate: string;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseHistory {
  id: string;
  expenseId: string;
  branchId: string;
  snapshot: Record<string, unknown>;
  changedBy?: string;
  changeType: "update" | "delete";
  changedAt: string;
}