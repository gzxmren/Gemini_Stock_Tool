import { useState, useEffect } from 'react';
import { Target } from 'lucide-react';

interface AnalystTargets {
    low?: number;
    mean?: number;
    high?: number;
}

interface AnalystConsensusProps {
    symbol: string;
    market: string;
    currentPrice: number;
}

export function AnalystConsensus({ symbol, market, currentPrice }: AnalystConsensusProps) {
    const [targets, setTargets] = useState<AnalystTargets | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (market !== 'US') return; // 目前只支持美股分析师数据

        const fetchTargets = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:8030/api/analyst/targets?symbol=${symbol}&market=${market}`);
                const data = await response.json();
                if (data && data.mean > 0) {
                    setTargets(data);
                } else {
                    setTargets(null);
                }
            } catch (err) {
                console.error("Failed to fetch analyst targets", err);
                setTargets(null);
            } finally {
                setLoading(false);
            }
        };

        fetchTargets();
    }, [symbol, market]);

    if (market !== 'US' || (!targets && !loading)) return null;

    if (loading) {
        return (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex items-center justify-center min-h-[140px]">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!targets || !targets.mean || !currentPrice) return null;

    const upside = ((targets.mean / currentPrice) - 1) * 100;
    
    // Calculate safe markers
    const getMarkerPos = (val: number) => {
        if (!targets.low || !targets.high || targets.low === targets.high) return 0;
        const pos = ((val - targets.low) / (targets.high - targets.low)) * 100;
        return Math.min(100, Math.max(0, pos));
    };
    
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
                    <div className="text-xl font-bold text-slate-600">
                        {targets.low ? Number(targets.low).toFixed(2) : '-'}
                    </div>
                </div>
                
                <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">均值</div>
                    <div className="text-4xl font-black text-slate-800">
                        {Number(targets.mean).toFixed(2)}
                    </div>
                    <div className={`text-sm font-bold mt-1 ${upside > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        预期空间: {upside > 0 ? '+' : ''}{upside.toFixed(1)}%
                    </div>
                </div>
                
                <div className="text-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">最高</div>
                    <div className="text-xl font-bold text-slate-600">
                        {targets.high ? Number(targets.high).toFixed(2) : '-'}
                    </div>
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
                            left: `${getMarkerPos(currentPrice)}%`, 
                            transform: 'translateX(-50%)' 
                        }}
                    >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-800 bg-slate-100 px-1.5 rounded">当前</div>
                    </div>
                    
                    {/* Mean Marker */}
                    <div 
                        className="absolute top-1 h-3 w-0.5 bg-blue-500"
                        style={{ 
                            left: `${getMarkerPos(targets.mean)}%` 
                        }}
                    />
                </div>
            )}
        </div>
    );
}
