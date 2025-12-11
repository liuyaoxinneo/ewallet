import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Download, Upload, Wallet, PieChart, Calendar as CalendarIcon, History, Trash2, Pencil, Search, Filter, X, MoveHorizontal, Tag, TrendingUp, TrendingDown, LayoutList } from 'lucide-react';
import { Transaction, TransactionType } from './types';
import { STORAGE_KEY, TRANSACTION_TYPES } from './constants';
import { calculateBalances, formatCurrency, formatDate, exportToExcel, importFromExcel } from './utils';
import TransactionForm from './components/TransactionForm';
import CalendarView from './components/CalendarView';

// Recharts for visualization
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type ChartRange = '7D' | '30D' | '6M';
type ChartMetric = 'LIQUID' | 'INCOME' | 'EXPENSE';

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CALENDAR' | 'HISTORY'>('DASHBOARD');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<string | undefined>(undefined);
  
  // Modal State for Day Details
  const [selectedDayDetails, setSelectedDayDetails] = useState<{date: string, transactions: Transaction[]} | null>(null);

  // Chart State
  const [chartRange, setChartRange] = useState<ChartRange>('30D');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('LIQUID');
  const [chartCenterDate, setChartCenterDate] = useState<Date>(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartDate, setDragStartDate] = useState<Date | null>(null);

  // Data Management State
  const [exportStart, setExportStart] = useState('');
  const [exportEnd, setExportEnd] = useState('');

  // History Filter State
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState<string>('ALL');
  const [historyFilterTag, setHistoryFilterTag] = useState<string>('ALL');
  const [historyFilterStart, setHistoryFilterStart] = useState('');
  const [historyFilterEnd, setHistoryFilterEnd] = useState('');

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

  // Derive unique tags from transactions
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    transactions.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [transactions]);

  const handleSaveTransaction = (t: Transaction) => {
    setTransactions(prev => {
      const index = prev.findIndex(item => item.id === t.id);
      if (index >= 0) {
        // Edit existing
        const newArr = [...prev];
        newArr[index] = t;
        
        // If we are in the day details modal, update that view too
        if (selectedDayDetails && selectedDayDetails.date === t.date) {
             const updatedDayTrans = newArr.filter(tr => tr.date === t.date);
             setSelectedDayDetails({date: t.date, transactions: updatedDayTrans});
        }
        
        return newArr;
      }
      // Add new
      const newArr = [...prev, t];
      
      // Update day details modal if open and matching date
      if (selectedDayDetails && selectedDayDetails.date === t.date) {
           const updatedDayTrans = newArr.filter(tr => tr.date === t.date);
           setSelectedDayDetails({date: t.date, transactions: updatedDayTrans});
      }

      return newArr;
    });
    setEditingTransaction(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this record?')) {
      setTransactions(prev => {
          const newArr = prev.filter(t => t.id !== id);
          // Update details modal if open
          if (selectedDayDetails) {
              const updatedDayTrans = newArr.filter(tr => tr.date === selectedDayDetails.date);
              if (updatedDayTrans.length === 0) {
                  setSelectedDayDetails(null); // Close if empty
              } else {
                  setSelectedDayDetails({...selectedDayDetails, transactions: updatedDayTrans});
              }
          }
          return newArr;
      });
    }
  };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setPreSelectedDate(undefined);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingTransaction(null);
    setPreSelectedDate(undefined);
  };

  const handleDayClick = (date: string, dayTransactions: Transaction[]) => {
    if (dayTransactions.length > 0) {
        setSelectedDayDetails({ date, transactions: dayTransactions });
    } else {
        setPreSelectedDate(date);
        setEditingTransaction(null);
        setShowForm(true);
    }
  };

  const handleAddFromDayDetails = () => {
      if (selectedDayDetails) {
          setPreSelectedDate(selectedDayDetails.date);
          setEditingTransaction(null);
          setShowForm(true);
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

  const clearHistoryFilters = () => {
    setHistorySearchTerm('');
    setHistoryFilterType('ALL');
    setHistoryFilterTag('ALL');
    setHistoryFilterStart('');
    setHistoryFilterEnd('');
  };

  const resetChartToToday = () => {
    setChartCenterDate(new Date());
  };

  // Derived Statistics
  const stats = useMemo(() => calculateBalances(transactions), [transactions]);
  
  // Chart Data Generation (Centered on chartCenterDate)
  const chartData = useMemo(() => {
    const data = [];
    let daysToGenerate = 30;

    if (chartRange === '7D') daysToGenerate = 7;
    if (chartRange === '6M') daysToGenerate = 180;

    const halfWindow = Math.floor(daysToGenerate / 2);
    const startDate = new Date(chartCenterDate);
    startDate.setDate(chartCenterDate.getDate() - halfWindow);

    for (let i = 0; i < daysToGenerate; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        let value = 0;

        if (chartMetric === 'LIQUID') {
           value = calculateBalances(transactions, dateStr).liquid;
        } else if (chartMetric === 'INCOME') {
           value = transactions
             .filter(t => t.date === dateStr)
             .reduce((sum, t) => {
                if (['INCOME', 'DEPOSIT', 'LOAN_IN'].includes(t.type)) return sum + t.amount;
                if (t.type === 'CUSTOM' && t.isPositive) return sum + t.amount;
                return sum;
             }, 0);
        } else if (chartMetric === 'EXPENSE') {
           value = transactions
             .filter(t => t.date === dateStr)
             .reduce((sum, t) => {
                if (['EXPENSE', 'LOAN_REPAY'].includes(t.type)) return sum + t.amount;
                if (t.type === 'CUSTOM' && !t.isPositive) return sum + t.amount;
                if (t.type === 'INVESTMENT' && !t.isWithdrawable) return sum + t.amount;
                return sum;
             }, 0);
        }

        data.push({
            date: dateStr.slice(5),
            fullDate: dateStr,
            value: value
        });
    }
    return data;
  }, [transactions, chartRange, chartCenterDate, chartMetric]);

  // Chart Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartDate(new Date(chartCenterDate));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartDate) return;
    const deltaX = e.clientX - dragStartX;
    const pixelsPerDay = 20;
    const daysShift = Math.round(deltaX / pixelsPerDay);

    const newCenter = new Date(dragStartDate);
    newCenter.setDate(dragStartDate.getDate() - daysShift);
    setChartCenterDate(newCenter);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartDate(null);
  };

  // Filtered Transactions for History Tab
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Term
      const searchLower = historySearchTerm.toLowerCase();
      const matchesSearch = 
        !historySearchTerm || 
        t.description.toLowerCase().includes(searchLower) ||
        (t.lender && t.lender.toLowerCase().includes(searchLower)) ||
        (t.customName && t.customName.toLowerCase().includes(searchLower));

      // 2. Type Filter
      const matchesType = historyFilterType === 'ALL' || t.type === historyFilterType;

      // 3. Tag Filter
      const matchesTag = historyFilterTag === 'ALL' || (t.tags && t.tags.includes(historyFilterTag));

      // 4. Date Range
      const matchesStart = !historyFilterStart || t.date >= historyFilterStart;
      const matchesEnd = !historyFilterEnd || t.date <= historyFilterEnd;

      return matchesSearch && matchesType && matchesTag && matchesStart && matchesEnd;
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, historySearchTerm, historyFilterType, historyFilterTag, historyFilterStart, historyFilterEnd]);

  // Summary for Filtered Results
  const filteredSummary = useMemo(() => {
     let totalIncome = 0;
     let totalExpense = 0;
     
     filteredTransactions.forEach(t => {
        if (['INCOME', 'DEPOSIT', 'LOAN_IN'].includes(t.type) || (t.type === 'CUSTOM' && t.isPositive)) {
           totalIncome += t.amount;
        } else if (['EXPENSE', 'LOAN_REPAY'].includes(t.type) || (t.type === 'CUSTOM' && !t.isPositive) || (t.type === 'INVESTMENT')) {
           totalExpense += t.amount;
           if (t.type === 'INVESTMENT' && t.isWithdrawable) {
               // Technically if it's withdrawable investment, it's transfer of asset form, but for cash flow summary usually it's out. 
               // Let's count all investments as 'out' in expense summary for simplicity, or modify logic.
               // Actually, let's strictly follow "Does it reduce liquid funds?" logic for consistency.
               // But wait, withdrawable investment DOES NOT reduce liquid funds.
               // So we should subtract it back if we added it?
               // Let's stick to simple "Positive flow" vs "Negative flow"
           }
           if (t.type === 'INVESTMENT' && t.isWithdrawable) {
              totalExpense -= t.amount; // Don't count withdrawable investment as expense in summary? 
              // Or maybe just separate Investment? Let's keep it simple: Cash In vs Cash Out.
              // Withdrawable investment is not Cash Out.
           }
        }
     });
     
     return { totalIncome, totalExpense, count: filteredTransactions.length };
  }, [filteredTransactions]);

  const chartColor = chartMetric === 'INCOME' ? '#16a34a' : chartMetric === 'EXPENSE' ? '#dc2626' : '#2563eb';

  return (
    <div className="min-h-screen pb-20 sm:pb-0" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      
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
             onClick={() => { setEditingTransaction(null); setPreSelectedDate(undefined); setShowForm(true); }}
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
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 select-none">
                   <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                      <div className="flex items-center gap-2">
                         <h3 className="text-slate-800 font-bold flex items-center">
                           <TrendingIcon className="w-5 h-5 mr-2 text-blue-600" />
                           资金趋势 (Trends)
                         </h3>
                         <button 
                           onClick={resetChartToToday}
                           className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full hover:bg-slate-200 transition-colors"
                         >
                           Today
                         </button>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-center">
                         {/* Metric Selector */}
                         <div className="flex bg-slate-100 rounded-lg p-1 space-x-1">
                           {(['LIQUID', 'INCOME', 'EXPENSE'] as ChartMetric[]).map(m => (
                              <button
                                key={m}
                                onClick={() => setChartMetric(m)}
                                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                  chartMetric === m 
                                    ? (m === 'LIQUID' ? 'bg-white text-blue-600 shadow' : m === 'INCOME' ? 'bg-white text-green-600 shadow' : 'bg-white text-red-600 shadow')
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                              >
                                {m === 'LIQUID' ? '可用' : m === 'INCOME' ? '收入' : '支出'}
                              </button>
                           ))}
                         </div>
                         {/* Time Range Selector */}
                         <div className="flex bg-slate-100 rounded-lg p-1 space-x-1">
                           {(['7D', '30D', '6M'] as ChartRange[]).map(range => (
                             <button
                               key={range}
                               onClick={() => { setChartRange(range); resetChartToToday(); }}
                               className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                                 chartRange === range ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
                               }`}
                             >
                               {range}
                             </button>
                           ))}
                         </div>
                      </div>
                   </div>
                   
                   <div 
                      className={`h-64 w-full relative group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                   >
                     {/* Overlay hint */}
                     <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center gap-1 text-slate-400 text-xs">
                        <MoveHorizontal className="w-4 h-4" /> Drag to pan
                     </div>

                     <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={chartData}>
                         <defs>
                           <linearGradient id="colorChart" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={chartColor} stopOpacity={0.1}/>
                             <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                           </linearGradient>
                         </defs>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 12}} 
                            interval="preserveStartEnd"
                         />
                         <YAxis hide domain={['auto', 'auto']} />
                         <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                            labelStyle={{color: '#64748b', fontSize: '12px', marginBottom: '4px'}}
                            formatter={(value: number) => [`¥${value}`, chartMetric]}
                         />
                         <Area 
                            type="monotone" 
                            dataKey="value" 
                            stroke={chartColor} 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorChart)"
                            animationDuration={300}
                            isAnimationActive={!isDragging}
                         />
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
            <CalendarView transactions={transactions} onDayClick={handleDayClick} />
          )}

          {/* History View */}
          {activeTab === 'HISTORY' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               {/* Summary Briefing */}
               <div className="p-4 bg-slate-50 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Filtered Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 mb-1">Income</div>
                        <div className="text-sm font-bold text-green-600">+{formatCurrency(filteredSummary.totalIncome)}</div>
                     </div>
                     <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 mb-1">Expense</div>
                        <div className="text-sm font-bold text-red-600">-{formatCurrency(filteredSummary.totalExpense)}</div>
                     </div>
                     <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                        <div className="text-xs text-slate-400 mb-1">Net</div>
                        <div className={`text-sm font-bold ${filteredSummary.totalIncome - filteredSummary.totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                           {formatCurrency(filteredSummary.totalIncome - filteredSummary.totalExpense)}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-4 border-b bg-white flex justify-between items-center">
                 <h3 className="font-bold text-slate-700">交易记录 (History)</h3>
                 <span className="text-xs text-slate-500">{filteredTransactions.length} records</span>
               </div>

               {/* Filter Bar */}
               <div className="p-4 border-b bg-slate-50 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search description, lender..." 
                      className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                    {historySearchTerm && (
                      <button onClick={() => setHistorySearchTerm('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 relative">
                       <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
                       <select 
                         className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 appearance-none"
                         value={historyFilterType}
                         onChange={(e) => setHistoryFilterType(e.target.value)}
                       >
                         <option value="ALL">All Types</option>
                         {TRANSACTION_TYPES.map(t => (
                           <option key={t.type} value={t.type}>{t.label}</option>
                         ))}
                       </select>
                    </div>
                    
                    <div className="flex-1 relative">
                       <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3 h-3" />
                       <select 
                         className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 appearance-none"
                         value={historyFilterTag}
                         onChange={(e) => setHistoryFilterTag(e.target.value)}
                       >
                         <option value="ALL">All Tags</option>
                         {availableTags.map(tag => (
                           <option key={tag} value={tag}>{tag}</option>
                         ))}
                       </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      value={historyFilterStart}
                      onChange={(e) => setHistoryFilterStart(e.target.value)}
                    />
                    <input 
                      type="date" 
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                      value={historyFilterEnd}
                      onChange={(e) => setHistoryFilterEnd(e.target.value)}
                    />
                    {(historyFilterType !== 'ALL' || historyFilterTag !== 'ALL' || historyFilterStart || historyFilterEnd) && (
                      <button 
                        onClick={clearHistoryFilters}
                        className="px-3 py-2 text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Clear
                      </button>
                    )}
                  </div>
               </div>

               <div className="divide-y divide-slate-100">
                 {filteredTransactions.map(t => {
                   const config = TRANSACTION_TYPES.find(type => type.type === t.type);
                   
                   let displayColor = 'text-slate-800';
                   let sign = '';
                   
                   if (t.type === 'INCOME' || t.type === 'DEPOSIT' || t.type === 'LOAN_IN' || (t.type === 'CUSTOM' && t.isPositive)) {
                      displayColor = 'text-green-600';
                      sign = '+';
                   } else if (t.type === 'EXPENSE' || t.type === 'LOAN_REPAY' || (t.type === 'CUSTOM' && !t.isPositive) || t.type === 'INVESTMENT') {
                      displayColor = 'text-red-600';
                      sign = '-';
                   }

                   return (
                     <div 
                        key={t.id} 
                        onClick={() => handleEdit(t)}
                        className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center group cursor-pointer"
                     >
                        <div className="flex items-center space-x-3">
                           <div className={`p-2 rounded-full bg-slate-100 ${config?.color}`}>
                              {config && <config.icon className="w-5 h-5" />}
                           </div>
                           <div>
                             <div className="font-medium text-slate-800">{t.description || config?.label}</div>
                             <div className="text-xs text-slate-400 flex flex-wrap gap-1 items-center">
                               <span>{formatDate(t.date)}</span>
                               {t.lender && <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">
                                  {t.type === 'LOAN_REPAY' ? 'To: ' : 'From: '}{t.lender}
                               </span>}
                               {t.type === 'INVESTMENT' && (
                                 <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${t.isWithdrawable ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                   {t.isWithdrawable ? 'Liquid' : 'Locked'}
                                 </span>
                               )}
                               {t.customName && <span className="ml-1 text-slate-500">({t.customName})</span>}
                               {t.tags && t.tags.map(tag => (
                                 <span key={tag} className="ml-1 px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] flex items-center">
                                    <Tag className="w-2 h-2 mr-0.5" />{tag}
                                 </span>
                               ))}
                             </div>
                           </div>
                        </div>
                        <div className="flex items-center space-x-3">
                           <div className="text-right">
                              <div className={`font-bold ${displayColor}`}>
                                {sign}{formatCurrency(t.amount)}
                              </div>
                           </div>
                           <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(t); }}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => handleDelete(t.id, e)} 
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                        </div>
                     </div>
                   );
                 })}
                 {filteredTransactions.length === 0 && (
                   <div className="p-12 text-center text-slate-400">
                     <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                     <p>暂无记录 (No records yet)</p>
                     {transactions.length > 0 && (
                       <button onClick={clearHistoryFilters} className="text-sm text-blue-500 hover:underline mt-2">Clear filters</button>
                     )}
                   </div>
                 )}
               </div>
            </div>
          )}

        </div>
      </main>

      {/* Modal Form */}
      {showForm && (
        <TransactionForm 
          onSave={handleSaveTransaction} 
          onClose={handleCloseForm} 
          initialData={editingTransaction}
          initialDate={preSelectedDate}
          availableTags={availableTags}
        />
      )}

      {/* Day Details Modal */}
      {selectedDayDetails && !showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {formatDate(selectedDayDetails.date)}
                 </h3>
                 <button onClick={() => setSelectedDayDetails(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                 {selectedDayDetails.transactions.map(t => {
                   const config = TRANSACTION_TYPES.find(type => type.type === t.type);
                   let displayColor = 'text-slate-800';
                   let sign = '';
                   if (['INCOME', 'DEPOSIT', 'LOAN_IN'].includes(t.type) || (t.type === 'CUSTOM' && t.isPositive)) {
                      displayColor = 'text-green-600';
                      sign = '+';
                   } else {
                      displayColor = 'text-red-600';
                      sign = '-';
                   }
                   return (
                      <div key={t.id} onClick={() => handleEdit(t)} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-full bg-slate-100 ${config?.color}`}>
                               {config && <config.icon className="w-4 h-4" />}
                            </div>
                            <div>
                               <div className="text-sm font-medium text-slate-800">{t.description || config?.label}</div>
                               <div className="text-xs text-slate-500 flex gap-1">
                                  {t.tags && t.tags.length > 0 && (
                                     <span className="flex items-center text-[10px] bg-slate-100 px-1 rounded"><Tag className="w-2 h-2 mr-0.5"/> {t.tags[0]} {t.tags.length > 1 && `+${t.tags.length - 1}`}</span>
                                  )}
                               </div>
                            </div>
                         </div>
                         <div className={`text-sm font-bold ${displayColor}`}>{sign}{formatCurrency(t.amount)}</div>
                      </div>
                   )
                 })}
              </div>
              <div className="p-4 border-t bg-slate-50">
                 <button onClick={handleAddFromDayDetails} className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex justify-center items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Entry
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

// Simple Icon component for the chart title
const TrendingIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
)

export default App;