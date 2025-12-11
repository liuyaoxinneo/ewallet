import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { TRANSACTION_TYPES } from '../constants';
import { generateId } from '../utils';
import { X, Tag } from 'lucide-react';

interface Props {
  onSave: (t: Transaction) => void;
  onClose: () => void;
  initialData?: Transaction | null;
  initialDate?: string;
  availableTags: string[];
}

const TransactionForm: React.FC<Props> = ({ onSave, onClose, initialData, initialDate, availableTags }) => {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  
  // Dynamic fields
  const [lender, setLender] = useState('');
  const [isWithdrawable, setIsWithdrawable] = useState(false);
  const [customName, setCustomName] = useState('');
  const [isPositive, setIsPositive] = useState(false);
  
  // Tags
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDate(initialData.date);
      setDescription(initialData.description);
      
      if (initialData.lender) setLender(initialData.lender);
      if (initialData.isWithdrawable !== undefined) setIsWithdrawable(initialData.isWithdrawable);
      if (initialData.customName) setCustomName(initialData.customName);
      if (initialData.isPositive !== undefined) setIsPositive(initialData.isPositive);
      if (initialData.tags) setTags(initialData.tags);
    }
  }, [initialData]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    // Add pending tag if input is not empty on save
    let finalTags = tags;
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      finalTags = [...tags, tagInput.trim()];
    }

    const newTransaction: Transaction = {
      id: initialData?.id || generateId(), // Preserve ID if editing
      date,
      type,
      amount: parseFloat(amount),
      description,
      lender: (type === 'LOAN_IN' || type === 'LOAN_REPAY') ? lender : undefined,
      isWithdrawable: type === 'INVESTMENT' ? isWithdrawable : undefined,
      customName: type === 'CUSTOM' ? customName : undefined,
      isPositive: type === 'CUSTOM' ? isPositive : undefined,
      tags: finalTags
    };

    onSave(newTransaction);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-white text-lg font-semibold">
            {initialData ? '修改记录 (Edit Entry)' : '记一笔 (New Entry)'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Amount Display */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">金额 (Amount)</label>
            <div className="flex items-center border-b-2 border-slate-200 focus-within:border-blue-500 transition-colors">
              <span className="text-2xl font-bold text-gray-400 mr-2">¥</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-bold text-slate-800 focus:outline-none py-2 bg-transparent"
                placeholder="0.00"
                autoFocus={!initialData}
                required
              />
            </div>
          </div>

          {/* Type Selection */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {TRANSACTION_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setType(t.type)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                  type === t.type 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <t.icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium leading-tight text-center">{t.label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">日期 (Date)</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                required
              />
            </div>
          </div>

          {/* Conditional Fields */}
          {(type === 'LOAN_IN' || type === 'LOAN_REPAY') && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">
                {type === 'LOAN_IN' ? '向谁借的 (Lender)' : '还给谁 (Repay To)'}
              </label>
              <input
                type="text"
                value={lender}
                onChange={(e) => setLender(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                placeholder={type === 'LOAN_IN' ? "Ex: 朋友张三, 银行..." : "Ex: 信用卡, 朋友..."}
              />
            </div>
          )}

          {type === 'INVESTMENT' && (
            <div className="flex items-center space-x-2 bg-orange-50 p-3 rounded-lg border border-orange-100">
              <input
                type="checkbox"
                id="withdrawable"
                checked={isWithdrawable}
                onChange={(e) => setIsWithdrawable(e.target.checked)}
                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
              />
              <label htmlFor="withdrawable" className="text-sm text-orange-800">
                可随时提现 (Withdrawable / Liquid)
              </label>
            </div>
          )}

          {type === 'CUSTOM' && (
            <div className="space-y-3 p-3 bg-pink-50 rounded-lg border border-pink-100">
               <div>
                  <label className="text-xs text-pink-700 font-medium block mb-1">项目名称 (Name)</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full p-2 border border-pink-200 rounded text-sm"
                    placeholder="Ex: 彩票中奖..."
                  />
               </div>
               <div className="flex gap-4">
                 <label className="flex items-center space-x-2">
                    <input type="radio" name="impact" checked={isPositive} onChange={() => setIsPositive(true)} />
                    <span className="text-sm text-pink-800">正向 (Add +)</span>
                 </label>
                 <label className="flex items-center space-x-2">
                    <input type="radio" name="impact" checked={!isPositive} onChange={() => setIsPositive(false)} />
                    <span className="text-sm text-pink-800">负向 (Subtract -)</span>
                 </label>
               </div>
            </div>
          )}

          {/* Tags Section */}
          <div>
             <label className="text-xs text-gray-500 font-medium block mb-1">标签 (Tags)</label>
             <div className="border rounded-lg p-2 bg-white flex flex-wrap gap-2 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
               {tags.map(tag => (
                 <span key={tag} className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full flex items-center">
                   {tag}
                   <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-slate-400 hover:text-slate-600">
                     <X className="w-3 h-3" />
                   </button>
                 </span>
               ))}
               <div className="relative flex-grow">
                 <input
                    type="text"
                    list="tags-list"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={tags.length === 0 ? "Add tags (Enter to add)" : ""}
                    className="text-sm w-full focus:outline-none min-w-[100px]"
                 />
                 <datalist id="tags-list">
                    {availableTags.filter(t => !tags.includes(t)).map(t => (
                      <option key={t} value={t} />
                    ))}
                 </datalist>
               </div>
             </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">备注 (Note)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded-lg text-sm"
              placeholder="Optional..."
            />
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-semibold shadow-lg shadow-slate-300 transition-all active:scale-95"
          >
            {initialData ? '更新 (Update)' : '保存 (Save)'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;