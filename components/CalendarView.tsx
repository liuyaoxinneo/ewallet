import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from '../types';
import { getDailyBalancesForMonth, formatCurrency } from '../utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  transactions: Transaction[];
}

const CalendarView: React.FC<Props> = ({ transactions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const dailyBalances = useMemo(() => 
    getDailyBalancesForMonth(transactions, year, month), 
    [transactions, year, month]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50"></div>);
  }

  // Days with data
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const balance = dailyBalances.get(dateStr) || 0;
    const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
    
    // Determine color based on trend compared to previous day (simplified: just simple color)
    // Actually simpler: Green if positive, Red if negative balance
    const textColor = balance >= 0 ? 'text-slate-700' : 'text-red-500';

    days.push(
      <div 
        key={d} 
        className={`h-24 border-t border-r p-1 flex flex-col justify-between transition-colors hover:bg-blue-50 cursor-pointer ${isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : 'bg-white'}`}
        title={`Balance: ${formatCurrency(balance)}`}
      >
        <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{d}</span>
        <div className="text-right">
             <span className={`text-xs sm:text-sm font-bold block ${textColor}`}>
                {new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(balance)}
             </span>
             <span className="text-[10px] text-gray-400 block">可用 (Avail)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-lg font-bold text-slate-800">资金日历 (Funds Calendar)</h2>
        <div className="flex items-center space-x-4">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-medium w-32 text-center">
            {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 text-center py-2 bg-slate-50 text-xs font-semibold text-gray-500 border-b">
        <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
      </div>
      
      <div className="grid grid-cols-7 border-l border-b bg-slate-100 gap-px">
        {days}
      </div>
      <div className="p-2 text-center text-xs text-gray-400">
        显示每日结束时的可用流动资金 (Estimated End-of-Day Liquid Funds)
      </div>
    </div>
  );
};

export default CalendarView;
