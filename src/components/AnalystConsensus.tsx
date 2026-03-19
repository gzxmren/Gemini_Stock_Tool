import { Target } from 'lucide-react';

interface AnalystTargets {
    low?: number;
    mean?: number;
    high?: number;
}

export function AnalystConsensus({ targets, currentPrice }: { targets: AnalystTargets | undefined, currentPrice: number }) {
    if (!targets || !targets.mean) return null;
    
    const upside = ((targets.mean / currentPrice) - 1) * 100;
    
    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-50 p-2 rounded-lg">
                    <Target className="text-blue-500" size={20} />
                </div>
                <h3 className="font-bold text-slate-700">分析师目标价 (1年预期)</h3>
            </div>
            
            <div className="flex justify-between items-end mb-2">
                <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">最低</div>
                    <div className="text-xl font-bold text-slate-600">{targets.low?.toFixed(2) || '-'}</div>
                </div>
                
                <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">均值</div>
                    <div className="text-4xl font-black text-slate-800">{targets.mean?.toFixed(2)}</div>
                    <div className={`text-sm font-bold mt-1 ${upside > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        预期空间: {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                    </div>
                </div>
                
                <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">最高</div>
                    <div className="text-xl font-bold text-slate-600">{targets.high?.toFixed(2) || '-'}</div>
                </div>
            </div>
            
            {/* Visual Bar */}
            {targets.low && targets.high && targets.mean && (
                <div className="relative mt-6 pt-2 pb-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full" />
                    
                    {/* Current Price Marker */}
                    <div 
                        className="absolute top-0 w-3 h-3 bg-slate-800 rounded-full border-2 border-white shadow"
                        style={{ 
                            left: `${Math.min(100, Math.max(0, ((currentPrice - targets.low) / (targets.high - targets.low)) * 100))}%`, 
                            transform: 'translateX(-50%)' 
                        }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 rounded">当前</div>
                    </div>
                    
                    {/* Mean Marker */}
                    <div 
                        className="absolute top-1 h-3 w-0.5 bg-blue-500"
                        style={{ 
                            left: `${Math.min(100, Math.max(0, ((targets.mean - targets.low) / (targets.high - targets.low)) * 100))}%` 
                        }}
                    />
                </div>
            )}
        </div>
    );
}
