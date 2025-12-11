import { Transaction, DailyBalance, TransactionType } from './types';
import * as XLSX from 'xlsx';

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2
  }).format(amount);
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

// Core Logic: Calculate Liquid Funds (Available Money) and Net Worth
export const calculateBalances = (transactions: Transaction[], targetDate?: string): { liquid: number; netWorth: number } => {
  const cutoff = targetDate ? new Date(targetDate).getTime() : Infinity;
  
  return transactions.reduce((acc, t) => {
    const tDate = new Date(t.date).getTime();
    if (tDate > cutoff) return acc;

    const amount = Number(t.amount);

    switch (t.type) {
      case 'INCOME':
      case 'DEPOSIT':
        acc.liquid += amount;
        acc.netWorth += amount;
        break;
      case 'EXPENSE':
        acc.liquid -= amount;
        acc.netWorth -= amount;
        break;
      case 'LOAN_IN':
        acc.liquid += amount;
        break;
      case 'INVESTMENT':
        if (t.isWithdrawable) {
           if (!t.isWithdrawable) {
             acc.liquid -= amount;
           }
        } else {
          acc.liquid -= amount;
          if (t.isWithdrawable) {
            acc.liquid += amount; 
          }
        }
        break;
      case 'CUSTOM':
        if (t.isPositive) {
           acc.liquid += amount;
           acc.netWorth += amount;
        } else {
           acc.liquid -= amount;
           acc.netWorth -= amount;
        }
        break;
    }
    return acc;
  }, { liquid: 0, netWorth: 0 });
};

// Helper for calendar to get daily balances for a month
export const getDailyBalancesForMonth = (transactions: Transaction[], year: number, month: number): Map<string, number> => {
  const map = new Map<string, number>();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Optimization: Sort transactions once
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningLiquid = 0;
  let tIndex = 0;

  // Pre-calculate balance up to start of month
  const startOfMonth = new Date(year, month, 1).getTime();
  
  while(tIndex < sorted.length && new Date(sorted[tIndex].date).getTime() < startOfMonth) {
      const t = sorted[tIndex];
      const amount = Number(t.amount);
      if (t.type === 'INCOME' || t.type === 'DEPOSIT' || t.type === 'LOAN_IN' || (t.type === 'CUSTOM' && t.isPositive)) runningLiquid += amount;
      if (t.type === 'EXPENSE' || (t.type === 'CUSTOM' && !t.isPositive)) runningLiquid -= amount;
      if (t.type === 'INVESTMENT') {
         runningLiquid -= amount;
         if (t.isWithdrawable) runningLiquid += amount;
      }
      tIndex++;
  }

  // Iterate days
  for (let day = 1; day <= daysInMonth; day++) {
    const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const endOfDay = new Date(year, month, day, 23, 59, 59).getTime();

    while(tIndex < sorted.length && new Date(sorted[tIndex].date).getTime() <= endOfDay) {
       const t = sorted[tIndex];
       const amount = Number(t.amount);
       if (t.type === 'INCOME' || t.type === 'DEPOSIT' || t.type === 'LOAN_IN' || (t.type === 'CUSTOM' && t.isPositive)) runningLiquid += amount;
       if (t.type === 'EXPENSE' || (t.type === 'CUSTOM' && !t.isPositive)) runningLiquid -= amount;
       if (t.type === 'INVESTMENT') {
          runningLiquid -= amount;
          if (t.isWithdrawable) runningLiquid += amount;
       }
       tIndex++;
    }
    map.set(currentDateStr, runningLiquid);
  }
  return map;
};

export const exportToExcel = (transactions: Transaction[], range?: {start: string, end: string}) => {
  let dataToExport = transactions;
  
  if (range) {
    const start = new Date(range.start).getTime();
    const end = new Date(range.end).getTime();
    dataToExport = transactions.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= start && d <= end;
    });
  }

  const rows = dataToExport.map(t => ({
    'ID': t.id,
    '日期 (Date)': t.date,
    '类型 (Type)': t.type,
    '金额 (Amount)': t.amount,
    '说明 (Description)': t.description,
    '债权人 (Lender)': t.lender || '',
    '可提现 (Withdrawable)': t.isWithdrawable ? 'Yes' : 'No',
    '自定义名称 (Custom Name)': t.customName || '',
    '正向影响 (Is Positive)': t.type === 'CUSTOM' ? (t.isPositive ? 'Yes' : 'No') : ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
  
  const fileName = `wealthflow_export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const importFromExcel = async (file: File): Promise<Transaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const transactions: Transaction[] = json.map((row: any) => ({
          id: row['ID'] || generateId(),
          date: row['日期 (Date)'] || new Date().toISOString().split('T')[0],
          type: row['类型 (Type)'] as TransactionType,
          amount: Number(row['金额 (Amount)']) || 0,
          description: row['说明 (Description)'] || '',
          lender: row['债权人 (Lender)'],
          isWithdrawable: row['可提现 (Withdrawable)'] === 'Yes',
          customName: row['自定义名称 (Custom Name)'],
          isPositive: row['正向影响 (Is Positive)'] === 'Yes'
        }));
        resolve(transactions);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};