import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { getDailyBalancesForMonth, formatCurrency } from '../utils';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { TRANSACTION_TYPES } from '../constants';

interface Props {
  transactions: Transaction[];
  onDayClick: (date: string, dayTransactions: Transaction[]) => void;
}

interface HoverInfo {
  date: string;
  balance: number;
  transactions: Transaction[];
  x: number;
  y: number;
}

const CalendarView: React.FC<Props> = ({ transactions, onDayClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  
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
  const handleToday = () => setCurrentDate(new Date());

  const handleMouseEnter = (e: React.MouseEvent, dateStr: string, balance: number) => {
    // Filter transactions for this day
    const daysTransactions = transactions.filter(t => t.date === dateStr);
    
    // Calculate position
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverInfo({
      date: dateStr,
      balance,
      transactions: daysTransactions,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10
    });
  };

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
    
    const textColor = balance >= 0 ? 'text-slate-700' : 'text-red-500';
    const dayTransactions = transactions.filter(t => t.date === dateStr);

    days.push(
      <div 
        key={d} 
        className={`h-24 border-t border-r p-1 flex flex-col justify-between transition-colors hover:bg-blue-50 cursor-pointer relative ${isToday ? 'bg-blue-50 ring-2 ring-inset ring-blue-200' : 'bg-white'}`}
        onMouseEnter={(e) => handleMouseEnter(e, dateStr, balance)}
        onMouseLeave={() => setHoverInfo(null)}
        onClick={() => onDayClick(dateStr, dayTransactions)}
      >
        <div className="flex justify-between items-start">
           <span className={`text-xs font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>{d}</span>
           {dayTransactions.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
           )}
        </div>
        <div className="text-right pointer-events-none">
             <span className={`text-xs sm:text-sm font-bold block ${textColor}`}>
                {new Intl.NumberFormat('en-US', { style: 'decimal', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(balance)}
             </span>
             <span className="text-[10px] text-gray-400 block">可用 (Avail)</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible relative">
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center border-b gap-3">
        <h2 className="text-lg font-bold text-slate-800">资金日历 (Funds Calendar)</h2>
        <div className="flex items-center space-x-2 bg-slate-100 rounded-full p-1">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-white rounded-full transition-shadow shadow-sm"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
          <span className="text-sm font-medium w-32 text-center text-slate-700">
            {currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}
          </span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-white rounded-full transition-shadow shadow-sm"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
        </div>
        <button 
          onClick={handleToday}
          className="text-xs font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-full flex items-center transition-colors"
        >
          <CalendarCheck className="w-4 h-4 mr-1" />
          回到今天 (Today)
        </button>
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

      {/* Tooltip */}
      {hoverInfo && (
        <div 
          className="fixed z-50 bg-slate-900 text-white p-3 rounded-lg shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 w-48"
          style={{ top: hoverInfo.y, left: hoverInfo.x }}
        >
          <div className="text-xs text-slate-400 border-b border-slate-700 pb-1 mb-2 font-medium">
            {hoverInfo.date}
          </div>
          <div className="text-lg font-bold mb-2">
            {formatCurrency(hoverInfo.balance)}
          </div>
          {hoverInfo.transactions.length > 0 ? (
            <div className="space-y-1 max-h-32 overflow-y-hidden">
              {hoverInfo.transactions.map((t, idx) => {
                 const typeConfig = TRANSACTION_TYPES.find(x => x.type === t.type);
                 return (
                   <div key={idx} className="flex justify-between text-[10px] items-center">
                     <div className="flex items-center gap-1 truncate max-w-[70%]">
                       <span className="opacity-70">{typeConfig?.label.split(' ')[0]}</span>
                     </div>
                     <span className={t.amount < 0 ? 'text-red-300' : 'text-green-300'}>
                       {formatCurrency(t.amount)}
                     </span>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic">No transactions</div>
          )}
          {/* Arrow */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;