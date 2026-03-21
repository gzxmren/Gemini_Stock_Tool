import React from 'react';
import { Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
    localIsCached: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ localIsCached }) => {
    return (
        <div className="bg-white border border-slate-100 rounded-3xl p-24 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 p-6 rounded-full mb-6">
                <Sparkles className="text-blue-600 animate-pulse" size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-3">AI 基本面时光机</h3>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
                请在上方选择您想要透视的财报日期。您可以分析单期历史数据，或开启“对比模式”研究公司基本面的动态变化。
            </p>
            {localIsCached && (
                <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 mb-4 animate-bounce">
                    <CheckCircle2 size={16} /> 发现匹配当前选择的缓存报告，正在努力加载...
                </div>
            )}
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                <ShieldCheck size={14} /> 数据来源于官方财报，分析由 DeepSeek 驱动
            </div>
        </div>
    );
};
