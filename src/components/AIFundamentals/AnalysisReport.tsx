import React from 'react';
import { 
    Activity, 
    Calendar, 
    History, 
    Download, 
    FileText, 
    RefreshCcw, 
    ShieldCheck, 
    AlertTriangle, 
    TrendingUp, 
    CheckCircle2, 
    Info 
} from 'lucide-react';

interface AnalysisData {
    highlights?: string[];
    lowlights?: string[];
    trends?: string[];
    health?: string;
    risks?: string[];
    conclusion?: string;
    score?: number;
    cached_at?: string;
    analysis_period?: string;
    is_preliminary?: boolean;
    confidence?: number;
}

interface AnalysisReportProps {
    symbol: string;
    analysis: AnalysisData;
    loading: boolean;
    isCompareMode: boolean;
    exporting: boolean;
    handleExport: (format: 'pdf' | 'markdown') => void;
    handleLogout: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
    symbol,
    analysis,
    loading,
    isCompareMode,
    exporting,
    handleExport,
    handleLogout
}) => {
    return (
        <div className={`bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden transition-all animate-in fade-in slide-in-from-bottom-4 ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            {analysis.is_preliminary && (
                <div className="bg-orange-500 text-white px-8 py-2 flex items-center gap-3 animate-pulse">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wider">
                        预警：当前分析基于业绩快报/初步数据，非审计后的正式季报，部分核心指标可能存在偏差。
                    </span>
                </div>
            )}
            
            <div className="bg-slate-800 p-8 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest border border-blue-500/30">
                                {isCompareMode ? 'Comparative Analysis' : 'Historical Insight'}
                            </div>
                            {analysis.is_preliminary && (
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-900/40">
                                    Preliminary Data
                                </div>
                            )}
                        </div>
                        <h2 className="text-3xl font-black mb-4 flex items-center gap-3">
                            <Activity className="text-blue-400" /> AI 财报深度透视: {symbol}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-blue-900/20">
                                <Calendar size={14} />
                                <span className="text-xs font-black uppercase tracking-tight">
                                    数据基准期: {analysis.analysis_period ? analysis.analysis_period.replace('Snapshot as of ', '').replace('(Express)', '') : '最新财报期'}
                                </span>
                            </div>

                            {analysis.cached_at && (
                                <div className="flex items-center gap-2 bg-slate-900/80 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700">
                                    <History size={12} className="text-blue-400" />
                                    <span className="text-[10px] font-bold">
                                        报告生成于: {analysis.cached_at}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-4">
                        {analysis.score && (
                            <div className="text-center bg-slate-900/50 p-4 rounded-2xl border border-slate-700">
                                <div className="text-4xl font-black text-blue-400 leading-none mb-1">{analysis.score}</div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">AI 健康得分</div>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <button onClick={() => handleExport('pdf')} disabled={exporting} className="text-[10px] font-black flex items-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600 px-4 py-2 rounded-xl transition-all shadow-lg disabled:opacity-50">
                                {exporting ? <RefreshCcw size={12} className="animate-spin" /> : <Download size={12} />} PDF
                            </button>
                            <button onClick={() => handleExport('markdown')} disabled={exporting} className="text-[10px] font-black flex items-center gap-1.5 bg-slate-700 text-white hover:bg-slate-600 px-4 py-2 rounded-xl transition-all shadow-lg disabled:opacity-50">
                                <FileText size={12} /> MD
                            </button>
                            <button onClick={handleLogout} className="text-[10px] font-black text-slate-500 hover:text-slate-300 border border-slate-700 px-3 py-2 rounded-xl transition-all">切换账号</button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 space-y-10">
                <section>
                    <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-600 pl-4"><h3 className="text-xl font-black text-slate-800">业绩红绿灯</h3></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-emerald-600 font-black mb-4"><ShieldCheck size={20} /> 业绩亮点</div>
                            <ul className="space-y-3">
                                {(analysis?.highlights || []).map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-slate-700 text-sm leading-relaxed font-medium"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{item}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 text-red-600 font-black mb-4"><AlertTriangle size={20} /> 业绩压力</div>
                            <ul className="space-y-3">
                                {(analysis?.lowlights || []).map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-slate-700 text-sm leading-relaxed font-medium"><div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-600 pl-4"><h3 className="text-xl font-black text-slate-800">指标趋势解读</h3></div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 shadow-inner">
                        <div className="space-y-4">
                            {(analysis?.trends || []).map((item, idx) => (
                                <div key={idx} className="flex gap-4"><TrendingUp className="text-blue-500 shrink-0 mt-1" size={18} /><p className="text-slate-700 leading-relaxed font-bold">{item}</p></div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-l-4 border-blue-600 pl-4"><h3 className="text-xl font-black text-blue-600">财务健康度</h3></div>
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 h-full shadow-sm"><p className="text-slate-700 leading-relaxed italic font-medium">"{analysis.health}"</p></div>
                    </section>
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-l-4 border-orange-500 pl-4"><h3 className="text-xl font-black text-orange-600">风险预警</h3></div>
                        <div className="bg-orange-50/30 border border-orange-100 rounded-2xl p-6 h-full shadow-sm">
                            <ul className="space-y-3">
                                {(analysis?.risks || []).map((item, idx) => (
                                    <li key={idx} className="flex gap-3 text-slate-700 text-sm font-medium"><AlertTriangle className="text-orange-500 shrink-0" size={16} />{item}</li>
                                ))}
                            </ul>
                        </div>
                    </section>
                </div>

                <section className="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3"><CheckCircle2 size={28} /><h3 className="text-2xl font-black">AI 结论建议</h3></div>
                            {analysis.confidence && (
                                <div className="flex items-center gap-2 bg-blue-500/30 border border-blue-400/30 px-4 py-1.5 rounded-full">
                                    <ShieldCheck size={16} className="text-blue-200" />
                                    <span className="text-xs font-black tracking-widest uppercase">
                                        置信度: {analysis.confidence}%
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-blue-50 leading-relaxed text-lg font-bold mb-6">{analysis.conclusion}</p>
                        <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-widest"><Info size={14} /> 投资有风险，入市需谨慎</div>
                    </div>
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500 rounded-full opacity-20 blur-3xl" />
                </section>
            </div>
        </div>
    );
};
