import { TransactionType } from './types';
import { Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, Landmark, Sparkles, CreditCard } from 'lucide-react';

export const TRANSACTION_TYPES: { type: TransactionType; label: string; icon: any; color: string }[] = [
  { type: 'INCOME', label: '入账 (Income)', icon: ArrowDownCircle, color: 'text-green-600' },
  { type: 'EXPENSE', label: '消费 (Expense)', icon: ArrowUpCircle, color: 'text-red-600' },
  { type: 'DEPOSIT', label: '现有存款 (Deposit)', icon: Landmark, color: 'text-blue-600' },
  { type: 'LOAN_IN', label: '借款 (Borrow)', icon: Wallet, color: 'text-purple-600' },
  { type: 'LOAN_REPAY', label: '还贷 (Repay)', icon: CreditCard, color: 'text-indigo-600' },
  { type: 'INVESTMENT', label: '投资 (Invest)', icon: TrendingUp, color: 'text-orange-600' },
  { type: 'CUSTOM', label: '自定义 (Custom)', icon: Sparkles, color: 'text-pink-600' },
];

export const STORAGE_KEY = 'wealthflow_data_v1';