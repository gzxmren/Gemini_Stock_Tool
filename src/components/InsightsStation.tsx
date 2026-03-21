import React, { useState, useEffect } from 'react';
import { Zap, AlertTriangle, TrendingUp, TrendingDown, Clock, ShieldAlert, RefreshCcw } from 'lucide-react';

interface InsightSignal {
    type: string;
    date?: string;
    [key: string]: any;
}

interface InsightsData {
    impact_summary: string;
    bull_case: string[];
    bear_case: string[];
    sentiment_score: number;
    has_data: boolean;
    raw_signals: InsightSignal[];
    cached_at?: string;
}

interface InsightsStationProps {
    symbol: string;
    market: string;
}

export const InsightsStation: React.FC<InsightsStationProps> = ({ symbol, market }) => {
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchInsights = async (refresh: boolean = false) => {
        setLoading(true);
        setError('');
        try {
            const url = `http://localhost:8030/api/insights/latest?symbol=${symbol}&market=${market}${refresh ? '&refresh=true' : ''}`;
            const res = await fetch(url);
            const json = await res.json();
            if (res.ok) {
                setData(json);
            } else {
                setError(json.detail || '获取情报失败');
            }
        } catch (err: any) {
            setError(err.message || '网络连接失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights(false);
    }, [symbol, market]);

    if (loading && !data) {
        return (
            <div className="bg-slate-900 rounded-3xl p-12 text-center text-slate-400 flex flex-col items-center shadow-2xl">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-green-400 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-slate-200">正在追踪核心情报...</h3>
                <p className="text-sm mt-2">AI 正在分析全网超前数据信号 (预告 / 快报 / 评级)</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/20 border border-red-500/30 rounded-3xl p-8 text-red-400 flex items-center gap-4">
                <AlertTriangle size={32} />
                <div>
                    <h3 className="text-lg font-bold text-red-300">情报追踪中断</h3>
                    <p className="text-sm">{error}</p>
                </div>
                <button onClick={() => fetchInsights(true)} className="ml-auto bg-red-900/50 hover:bg-red-800 text-red-200 px-4 py-2 rounded-xl text-sm font-bold transition-all">重试</button>
            </div>
        );
    }

    if (!data) return null;

    const renderSignalCard = (signal: InsightSignal, idx: number) => {
        return (
            <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 hover:bg-slate-800 transition-all group">
                <div className="flex items-center justify-between mb-3 border-b border-slate-700 pb-3">
                    <span className="text-xs font-black text-green-400 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={14} className="text-green-500" /> {signal.type}
                    </span>
                    {signal.date && <span className="text-xs font-mono text-slate-500">{signal.date}</span>}
                </div>
                <div className="space-y-2 text-sm text-slate-300 font-medium">
                    {Object.entries(signal).filter(([k]) => !['type', 'date'].includes(k)).map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-4">
                            <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span>
                            <span className="text-slate-200 text-right font-bold">
                                {Array.isArray(v) ? (
                                    <ul className="list-disc list-inside text-left">
                                        {v.map((item, i) => <li key={i} className="mb-1 truncate max-w-xs" title={item}>{item}</li>)}
                                    </ul>
                                ) : (
                                    String(v)
                                )}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-800 text-slate-200 animate-in fade-in slide-in-from-bottom-4">
            {/* Header */}
            <div className="bg-slate-950 p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Zap size={28} className="text-green-400" />
                        <h2 className="text-3xl font-black text-white tracking-tight">AI 业绩情报站</h2>
                        <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-green-500/30">Early Bird</span>
                    </div>
                    <p className="text-slate-400 text-sm">洞察非正式财报（预告/快报/机构评级）的短期预期差。</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {data.cached_at && (
                        <div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                            <Clock size={12} />
                            上次更新: {data.cached_at}
                        </div>
                    )}
                    <button 
                        onClick={() => fetchInsights(true)} 
                        disabled={loading}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 border border-slate-700 hover:border-slate-600 disabled:opacity-50"
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin text-green-400' : ''} />
                        强制刷新
                    </button>
                </div>
            </div>

            {!data.has_data ? (
                <div className="p-16 text-center">
                    <ShieldAlert size={48} className="mx-auto text-slate-700 mb-4 opacity-50" />
                    <h3 className="text-xl font-bold text-slate-400 mb-2">该股票近期无前瞻情报</h3>
                    <p className="text-sm text-slate-600">未监测到最近 1 年内的业绩快报、预告或评级大幅调整。请依赖正式财报。</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                    {/* 左侧：信号源列表 */}
                    <div className="lg:col-span-5 border-r border-slate-800 bg-slate-900/50 p-8 flex flex-col h-[600px] overflow-y-auto custom-scrollbar">
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 sticky top-0 bg-slate-900/50 backdrop-blur-md py-2">捕获的原始信号</h3>
                        <div className="space-y-4 flex-1">
                            {data.raw_signals.map((sig, idx) => renderSignalCard(sig, idx))}
                        </div>
                    </div>

                    {/* 右侧：AI 催化剂解读 */}
                    <div className="lg:col-span-7 p-8 relative overflow-hidden flex flex-col h-[600px] overflow-y-auto">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500 rounded-full opacity-5 blur-[100px] pointer-events-none" />
                        
                        {/* 情绪分仪表盘简版 */}
                        <div className="flex items-center gap-6 mb-8 bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50">
                            <div className="relative w-20 h-20 flex-shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path 
                                        className={data.sentiment_score >= 60 ? 'text-green-500' : data.sentiment_score <= 40 ? 'text-red-500' : 'text-yellow-500'} 
                                        strokeDasharray={`${data.sentiment_score}, 100`} 
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                        fill="none" stroke="currentColor" strokeWidth="3" 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col text-white font-black text-xl">
                                    {data.sentiment_score}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">情绪热度指数</h3>
                                <p className="text-lg font-bold text-slate-200">
                                    {data.sentiment_score >= 80 ? '极度乐观 (Strong Bullish)' : 
                                     data.sentiment_score >= 60 ? '偏向乐观 (Bullish)' : 
                                     data.sentiment_score <= 20 ? '极度悲观 (Strong Bearish)' : 
                                     data.sentiment_score <= 40 ? '偏向悲观 (Bearish)' : '中性 (Neutral)'}
                                </p>
                            </div>
                        </div>

                        {/* 核心影响解读 */}
                        <div className="mb-8">
                            <h3 className="flex items-center gap-2 text-lg font-black text-white mb-4"><Zap size={20} className="text-yellow-400"/> 催化剂冲击力摘要</h3>
                            <p className="text-slate-300 leading-relaxed text-base font-medium p-6 bg-slate-800/40 rounded-2xl border-l-4 border-yellow-500">
                                {data.impact_summary}
                            </p>
                        </div>

                        {/* Bull vs Bear */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                            <div className="bg-green-950/20 border border-green-500/20 p-6 rounded-3xl">
                                <h3 className="flex items-center gap-2 text-green-400 font-black mb-4 uppercase text-sm tracking-widest">
                                    <TrendingUp size={18} /> 利好 / 超预期
                                </h3>
                                <ul className="space-y-3">
                                    {data.bull_case.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-green-100/80 leading-relaxed">
                                            <span className="text-green-500 mt-1">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-red-950/20 border border-red-500/20 p-6 rounded-3xl">
                                <h3 className="flex items-center gap-2 text-red-400 font-black mb-4 uppercase text-sm tracking-widest">
                                    <TrendingDown size={18} /> 风险 / 隐忧
                                </h3>
                                <ul className="space-y-3">
                                    {data.bear_case.map((item, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-red-100/80 leading-relaxed">
                                            <span className="text-red-500 mt-1">•</span> {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
