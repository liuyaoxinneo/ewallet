import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Download, Upload, Wallet, PieChart, Calendar as CalendarIcon, History, Trash2, Search } from 'lucide-react';
import { Transaction, TransactionType } from './types';
import { STORAGE_KEY, TRANSACTION_TYPES } from './constants';
import { calculateBalances, formatCurrency, formatDate, exportToExcel, importFromExcel } from './utils';
import TransactionForm from './components/TransactionForm';
import CalendarView from './components/CalendarView';

// Recharts for visualization
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CALENDAR' | 'HISTORY'>('DASHBOARD');
  
  // Data Management State
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  // Load from LocalStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse data", e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  const handleSaveTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleExport = () => {
    const range = (exportStart && exportEnd) ? { start: exportStart, end: exportEnd } : undefined;
    exportToExcel(transactions, range);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const imported = await importFromExcel(e.target.files[0]);
        if (confirm(`Found ${imported.length} records. Replace existing data (Cancel to Merge)?`)) {
            setTransactions(imported);
        } else {
            setTransactions(prev => [...prev, ...imported]);
        }
      } catch (err) {
        alert("Failed to import Excel file. Please ensure format is correct.");
      }
    }
  };

  // Derived Statistics
  const stats = useMemo(() => calculateBalances(transactions), [transactions]);
  
  // Chart Data (Last 30 days trend of Liquid Funds)
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const balances = calculateBalances(transactions, dateStr);
        data.push({
            date: dateStr.slice(5), // MM-DD
            liquid: balances.liquid
        });
    }
    return data;
  }, [transactions]);

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      
      {/* Header */}
      <header className="bg-slate-900 text-white pt-8 pb-12 px-6 shadow-lg rounded-b-[2.5rem]">
        <div className="max-w-5xl mx-auto flex justify-between items-start">
           <div>
             <h1 className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">可用资金 (Liquid Funds)</h1>
             <div className="text-4xl sm:text-5xl font-bold tracking-tight">
               {formatCurrency(stats.liquid)}
             </div>
             <div className="mt-2 text-slate-400 text-sm flex items-center gap-2">
               <span>净资产 (Net Worth): {formatCurrency(stats.netWorth)}</span>
             </div>
           </div>
           <button 
             onClick={() => setShowForm(true)}
             className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3 shadow-lg shadow-blue-900/50 transition-all active:scale-95"
           >
             <Plus className="w-6 h-6" />
           </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 -mt-8">
        
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6">
           <div className="bg-white p-1 rounded-full shadow-md flex space-x-1">
              {[
                { id: 'DASHBOARD', icon: PieChart, label: '概览 (View)' },
                { id: 'CALENDAR', icon: CalendarIcon, label: '日历 (Cal)' },
                { id: 'HISTORY', icon: History, label: '明细 (List)' }
              ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                     activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
                   }`}
                 >
                   <tab.icon className="w-4 h-4" />
                   <span className="hidden sm:inline">{tab.label}</span>
                 </button>
              ))}
           </div>
        </div>

        {/* Views */}
        <div className="space-y-6">
          
          {/* Dashboard View */}
          {activeTab === 'DASHBOARD' && (
             <div className="space-y-6">
                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                   <h3 className="text-slate-800 font-bold mb-4 flex items-center">
                     <TrendingIcon className="w-5 h-5 mr-2 text-blue-600" />
                     30天资金趋势 (30-Day Trend)
                   </h3>
                   <div className="h-64 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorLiquid" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                             <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                         <YAxis hide domain={['auto', 'auto']} />
                         <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            formatter={(value: number) => [`¥${value}`, 'Liquid']}
                         />
                         <Area type="monotone" dataKey="liquid" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorLiquid)" />
                       </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

                {/* Data Management Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="text-slate-800 font-bold mb-4">数据管理 (Data)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase">导出 Excel (Export)</label>
                          <div className="flex gap-2">
                             <input type="date" className="border rounded p-2 text-sm w-full" onChange={e => setExportStart(e.target.value)} />
                             <span className="self-center text-slate-300">-</span>
                             <input type="date" className="border rounded p-2 text-sm w-full" onChange={e => setExportEnd(e.target.value)} />
                          </div>
                          <button onClick={handleExport} className="w-full flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition-colors text-sm font-medium">
                            <Download className="w-4 h-4" />
                            <span>导出 (Download)</span>
                          </button>
                       </div>
                       
                       <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-400 uppercase">导入 Excel (Restore)</label>
                          <label className="w-full flex items-center justify-center space-x-2 border-2 border-dashed border-slate-200 hover:border-blue-400 cursor-pointer py-5 rounded-lg text-slate-500 transition-colors">
                            <Upload className="w-4 h-4" />
                            <span className="text-sm">点击选择文件 (Select File)</span>
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                          </label>
                       </div>
                    </div>
                </div>
             </div>
          )}

          {/* Calendar View */}
          {activeTab === 'CALENDAR' && (
            <CalendarView transactions={transactions} />
          )}

          {/* History View */}
          {activeTab === 'HISTORY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-700">交易记录 (History)</h3>
                 <span className="text-xs text-slate-500">{transactions.length} records</span>
               </div>
               <div className="divide-y divide-slate-100">
                 {transactions.slice().reverse().map(t => {
                   const config = TRANSACTION_TYPES.find(type => type.type === t.type);
                   const isPositive = t.type === 'INCOME' || t.type === 'DEPOSIT' || t.type === 'LOAN_IN' || (t.type === 'CUSTOM' && t.isPositive) || (t.type === 'INVESTMENT' && t.isWithdrawable); 
                   // Logic for rendering +/- sign visually (not calculating logic)
                   // Display logic: Green for inflows, Red for outflows.
                   // LOAN_IN: Green (+Cash). Investment: Red (-Cash). Expense: Red. Income: Green.
                   
                   let displayColor = 'text-slate-800';
                   let sign = '';
                   
                   if (t.type === 'INCOME' || t.type === 'DEPOSIT' || t.type === 'LOAN_IN' || (t.type === 'CUSTOM' && t.isPositive)) {
                      displayColor = 'text-green-600';
                      sign = '+';
                   } else if (t.type === 'EXPENSE' || (t.type === 'CUSTOM' && !t.isPositive) || t.type === 'INVESTMENT') {
                      displayColor = 'text-red-600';
                      sign = '-';
                   }

                   return (
                     <div key={t.id} className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                        <div className="flex items-center space-x-3">
                           <div className={`p-2 rounded-full bg-slate-100 ${config?.color}`}>
                              {config && <config.icon className="w-5 h-5" />}
                           </div>
                           <div>
                             <div className="font-medium text-slate-800">{t.description || config?.label}</div>
                             <div className="text-xs text-slate-400">
                               {formatDate(t.date)} 
                               {t.lender && <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">From: {t.lender}</span>}
                               {t.type === 'INVESTMENT' && (
                                 <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${t.isWithdrawable ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                   {t.isWithdrawable ? 'Liquid' : 'Locked'}
                                 </span>
                               )}
                               {t.customName && <span className="ml-2 text-slate-500">({t.customName})</span>}
                             </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className={`font-bold ${displayColor}`}>
                             {sign}{formatCurrency(t.amount)}
                           </div>
                           <button 
                             onClick={() => handleDelete(t.id)} 
                             className="text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:underline mt-1"
                           >
                             Delete
                           </button>
                        </div>
                     </div>
                   );
                 })}
                 {transactions.length === 0 && (
                   <div className="p-12 text-center text-slate-400">
                     <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>暂无记录 (No records yet)</p>
                   </div>
                 )}
               </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <TransactionForm onSave={handleSaveTransaction} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// Simple Icon component for the chart title to avoid confusion
const TrendingIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
)

export default App;
