export type TransactionType = 'INCOME' | 'EXPENSE' | 'LOAN_IN' | 'INVESTMENT' | 'DEPOSIT' | 'CUSTOM';

export interface Transaction {
  id: string;
  date: string; // ISO YYYY-MM-DD
  amount: number;
  type: TransactionType;
  description: string;
  
  // Specific fields based on type
  lender?: string; // For LOAN_IN (Who did I borrow from?)
  isWithdrawable?: boolean; // For INVESTMENT (Can I use this money now?)
  customName?: string; // For CUSTOM
  isPositive?: boolean; // For CUSTOM (Does it add or subtract from wealth?)
}

export interface DailyBalance {
  date: string;
  liquidFunds: number; // Available to spend
  totalNetWorth: number; // Total assets - liabilities
}

export interface AppState {
  transactions: Transaction[];
  currency: string;
}

export interface DateRange {
  start: string;
  end: string;
}
