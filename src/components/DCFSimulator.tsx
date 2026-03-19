import { Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface DCFBaseline {
    fcf: number;
    shares: number;
}

export function DCFSimulator({ baseline, currentPrice }: { baseline: DCFBaseline | undefined, currentPrice: number }) {
    if (!baseline || baseline.shares === 0) return null;

    const [growthRate, setGrowthRate] = useState(10); // 10%
    const [discountRate, setDiscountRate] = useState(9); // 9%
    const [terminalRate, setTerminalRate] = useState(2); // 2%
    const [intrinsicValue, setIntrinsicValue] = useState<number | null>(null);

    // Call backend API when sliders change
    useEffect(() => {
        const fetchDCF = async () => {
            try {
                const response = await fetch('http://localhost:8000/api/dcf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fcf: baseline.fcf,
                        shares: baseline.shares,
                        growth_rate: growthRate / 100,
                        discount_rate: discountRate / 100,
                        terminal_rate: terminalRate / 100,
                        years: 5
                    })
                });
                const data = await response.json();
                setIntrinsicValue(data.intrinsic_value);
            } catch (e) {
                console.error("Failed to calculate DCF", e);
            }
        };

        // Simple debounce
        const timeoutId = setTimeout(() => {
            fetchDCF();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [growthRate, discountRate, terminalRate, baseline]);

    const marginOfSafety = intrinsicValue ? ((intrinsicValue - currentPrice) / currentPrice) * 100 : 0;
    const isUndervalued = marginOfSafety > 0;

    return (
        <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Left: Interactive Controls */}
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-slate-800 p-2 rounded-lg">
                            <Calculator className="text-blue-400" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-100">交互式 DCF 估值模型</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-slate-400">预期年化增长率 (前5年)</span>
                                <span className="text-blue-400">{growthRate}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="40" value={growthRate} 
                                onChange={(e) => setGrowthRate(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-slate-400">折现率 (期望回报率)</span>
                                <span className="text-blue-400">{discountRate}%</span>
                            </div>
                            <input 
                                type="range" min="5" max="20" step="0.5" value={discountRate} 
                                onChange={(e) => setDiscountRate(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between text-sm font-medium mb-2">
                                <span className="text-slate-400">永续增长率</span>
                                <span className="text-blue-400">{terminalRate}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="5" step="0.5" value={terminalRate} 
                                onChange={(e) => setTerminalRate(Number(e.target.value))}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-6 flex gap-2">
                        <button onClick={() => {setGrowthRate(5); setDiscountRate(12); setTerminalRate(1);}} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors">悲观预期</button>
                        <button onClick={() => {setGrowthRate(10); setDiscountRate(9); setTerminalRate(2);}} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors">基准预期</button>
                        <button onClick={() => {setGrowthRate(20); setDiscountRate(8); setTerminalRate(3);}} className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 transition-colors">乐观预期</button>
                    </div>
                </div>

                {/* Right: Results */}
                <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 flex flex-col justify-center">
                    <div className="text-center mb-6">
                        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">计算得出的内在价值</div>
                        <div className="text-6xl font-black text-white tracking-tighter">
                            ${intrinsicValue !== null ? intrinsicValue.toFixed(2) : '...'}
                        </div>
                    </div>

                    <div className={`rounded-xl p-4 flex items-start gap-3 ${isUndervalued ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                        {isUndervalued ? <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="text-red-400 shrink-0 mt-0.5" />}
                        <div>
                            <div className={`font-bold ${isUndervalued ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isUndervalued ? '存在安全边际 (极度低估)' : '估值透支 (高估风险)'}
                            </div>
                            <div className="text-sm text-slate-300 mt-1">
                                {isUndervalued ? '当前股价低于内在价值。' : '当前股价已高于计算出的内在价值。'} 
                                安全边际: <b>{marginOfSafety > 0 ? '+' : ''}{marginOfSafety.toFixed(1)}%</b>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
