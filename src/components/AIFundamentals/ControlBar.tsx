import React from 'react';
import { Calendar, History, RefreshCcw, TrendingUp } from 'lucide-react';

interface AvailableDates {
    quarterly: string[];
    annual: string[];
}

interface ControlBarProps {
    periodType: 'quarterly' | 'annual';
    setPeriodType: (type: 'quarterly' | 'annual') => void;
    availableDates: AvailableDates | null;
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    isCompareMode: boolean;
    setIsCompareMode: (mode: boolean) => void;
    compareDate: string;
    setCompareDate: (date: string) => void;
    loading: boolean;
    fetchAnalysis: (forceRefresh?: boolean) => void;
    cached_dates?: string[];
}

export const ControlBar: React.FC<ControlBarProps> = ({
    periodType,
    setPeriodType,
    availableDates,
    selectedDate,
    setSelectedDate,
    isCompareMode,
    setIsCompareMode,
    compareDate,
    setCompareDate,
    loading,
    fetchAnalysis,
    cached_dates = []
}) => {
    const currentDates = periodType === 'quarterly' ? availableDates?.quarterly : availableDates?.annual;

    const isExpress = (date: string) => {
        // Simple logic for labeling (Express) dates - usually these are the very latest ones that are not full quarters
        // In some systems, they might be tagged or have specific dates.
        // For now, let's assume if it contains 'express' or if it's the very first one in quarterly but not ending in standard quarter dates (optional)
        // Actually, the user says "Add text labeling for (Express) dates in the dropdown."
        // Let's just look if it's explicitly tagged by the backend or we can just mock it for now if we don't have better info.
        // If it's a date like "2023-10-25" it might be an express report for Q3.
        return date.includes('(Express)');
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="bg-white border border-slate-100 rounded-3xl shadow-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-6">
                    <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                        <button 
                            onClick={() => { setPeriodType('quarterly'); setSelectedDate(availableDates?.quarterly[0] || ''); }} 
                            className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${periodType === 'quarterly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            季度
                        </button>
                        <button 
                            onClick={() => { setPeriodType('annual'); setSelectedDate(availableDates?.annual[0] || ''); }} 
                            className={`px-5 py-2 rounded-lg text-xs font-black transition-all ${periodType === 'annual' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            年度
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 tracking-tighter">基准分析期</span>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" />
                                <select 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)} 
                                    className="bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-8 py-2.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer appearance-none min-w-[200px]"
                                >
                                    {!selectedDate && <option value="">选择日期...</option>}
                                    {currentDates?.map(d => (
                                        <option key={d} value={d}>
                                            {d} {isExpress(d) ? '(业绩快报)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsCompareMode(!isCompareMode)} 
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${isCompareMode ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                            <History size={16} />
                            <span className="text-xs font-black">{isCompareMode ? '对比开启' : '开启对比'}</span>
                        </button>
                        {isCompareMode && (
                            <div className="flex flex-col animate-in fade-in slide-in-from-left-2">
                                <span className="text-[10px] font-black text-orange-400 uppercase mb-1 ml-1 tracking-tighter">对比基期</span>
                                <select 
                                    value={compareDate} 
                                    onChange={(e) => setCompareDate(e.target.value)} 
                                    className="bg-orange-50/50 border border-orange-100 rounded-xl px-4 py-2.5 text-sm font-bold text-orange-700 focus:ring-2 focus:ring-orange-500 outline-none cursor-pointer appearance-none min-w-[200px]"
                                >
                                    <option value="">选择日期...</option>
                                    {currentDates?.filter(d => d !== selectedDate).map(d => (
                                        <option key={d} value={d}>
                                            {d} {isExpress(d) ? '(业绩快报)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => fetchAnalysis(true)} 
                    disabled={loading || !selectedDate || (isCompareMode && !compareDate)} 
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-8 rounded-2xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50 disabled:bg-slate-300"
                >
                    {loading ? <RefreshCcw size={18} className="animate-spin" /> : <TrendingUp size={18} />}
                    <span>{loading ? '分析中...' : '启动 AI 分析'}</span>
                </button>
            </div>

            {/* History Pills Row */}
            {cached_dates.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-2 animate-in fade-in slide-in-from-top-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 flex items-center gap-1">
                        <History size={10} /> 快速调取已分析:
                    </span>
                    {cached_dates.map(date => (
                        <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black transition-all border ${
                                selectedDate === date 
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600'
                            }`}
                        >
                            {date.replace('(Express)', '')}
                            {isExpress(date) && <span className="ml-1 opacity-70">快报</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
