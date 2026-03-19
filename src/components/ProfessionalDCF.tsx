import { useState, useEffect } from 'react';
import { Calculator, ArrowRight, DollarSign, Activity, Gift, Globe } from 'lucide-react';

interface DCFData {
    symbol: string;
    currency_info: {
        report_currency: string;
        trade_currency: string;
        fx_rate: number;
    };
    income_statement: {
        revenue: number;
        ebit: number;
        tax_rate: number;
    };
    cash_flow: {
        da: number;
        capex: number;
        change_in_wc: number;
    };
    balance_sheet: {
        total_debt: number;
        cash: number;
        minority_interest: number;
        shares_outstanding: number;
    };
    dividends: {
        yield: number;
        payout_ratio: number;
        history: { year: number, amount: number }[];
    };
    wacc_params: {
        beta: number;
        cost_of_equity: number;
        cost_of_debt: number;
    };
}

export function ProfessionalDCF({ symbol, currentPrice }: { symbol: string, currentPrice: number }) {
    const [data, setData] = useState<DCFData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Assumptions State
    const [revenueGrowth, setRevenueGrowth] = useState(10);
    const [ebitMargin, setEbitMargin] = useState(25);
    const [waccOverride, setWaccOverride] = useState<number | null>(null);
    const [terminalGrowth, setTerminalGrowth] = useState(2.5);

    useEffect(() => {
        const fetchDCFData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`http://localhost:8000/api/dcf/professional?symbol=${symbol}`);
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json);
                if (json.income_statement.revenue > 0) {
                    setEbitMargin(Number(((json.income_statement.ebit / json.income_statement.revenue) * 100).toFixed(1)));
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDCFData();
    }, [symbol]);

    if (loading) return <div className="p-10 text-center text-slate-500">正在构建专业估值模型... (含汇率转换与分红分析)</div>;
    if (error || !data) return <div className="p-10 text-center text-red-500">无法获取数据。</div>;

    // --- Core DCF Engine ---
    const calculatedWACC = (0.8 * data.wacc_params.cost_of_equity) + (0.2 * data.wacc_params.cost_of_debt * (1 - data.income_statement.tax_rate));
    const effectiveWACC = waccOverride !== null ? (waccOverride / 100) : calculatedWACC;

    let currentRev = data.income_statement.revenue;
    const projectedFCFF = [];
    for (let i = 1; i <= 5; i++) {
        currentRev *= (1 + (revenueGrowth / 100));
        const projEbit = currentRev * (ebitMargin / 100);
        const scale = currentRev / data.income_statement.revenue;
        const fcff = (projEbit * (1 - data.income_statement.tax_rate)) + (data.cash_flow.da * scale) - (data.cash_flow.capex * scale) - (data.cash_flow.change_in_wc * scale);
        const pvFcff = fcff / Math.pow(1 + effectiveWACC, i);
        projectedFCFF.push({ year: i, rev: currentRev, ebit: projEbit, fcff, pvFcff });
    }

    const terminalValue = (projectedFCFF[4].fcff * (1 + (terminalGrowth / 100))) / (effectiveWACC - (terminalGrowth / 100));
    const pvTerminalValue = terminalValue / Math.pow(1 + effectiveWACC, 5);
    const sumPvFcff = projectedFCFF.reduce((sum, yr) => sum + yr.pvFcff, 0);
    const enterpriseValue = sumPvFcff + pvTerminalValue;
    const equityValue = enterpriseValue + data.balance_sheet.cash - data.balance_sheet.total_debt - data.balance_sheet.minority_interest;
    const intrinsicValuePerShare = data.balance_sheet.shares_outstanding > 0 ? (equityValue / data.balance_sheet.shares_outstanding) : 0;
    const marginOfSafety = ((intrinsicValuePerShare - currentPrice) / currentPrice) * 100;

    const formatB = (num: number) => `$${(num / 1000000000).toFixed(2)}B`;

    return (
        <div className="space-y-6 pb-20">
            {/* 汇率转换提示 (如果是 ADR) */}
            {data.currency_info.fx_rate !== 1 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3 text-amber-800 text-sm">
                    <Globe size={18} className="text-amber-500" />
                    <div>
                        <b>汇率自动转换：</b>检测到报表币种为 <b>{data.currency_info.report_currency}</b>，已按 <b>1:{data.currency_info.fx_rate.toFixed(4)}</b> 实时汇率折算为交易货币 (USD)。
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Assumptions */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Activity className="text-blue-500" size={18}/> 核心假设</h3>
                    <div className="space-y-6">
                        <div>
                            <div className="flex justify-between text-xs mb-2"><span>营收增速</span> <span>{revenueGrowth}%</span></div>
                            <input type="range" min="-10" max="50" value={revenueGrowth} onChange={(e) => setRevenueGrowth(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2"><span>EBIT 利润率</span> <span>{ebitMargin}%</span></div>
                            <input type="range" min="0" max="60" value={ebitMargin} onChange={(e) => setEbitMargin(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-2"><span>WACC</span> <span>{(effectiveWACC*100).toFixed(2)}%</span></div>
                            <input type="range" min="5" max="20" step="0.5" value={waccOverride || (calculatedWACC*100)} onChange={(e) => setWaccOverride(Number(e.target.value))} className="w-full accent-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Cash Flow Table */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 overflow-x-auto">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Calculator className="text-emerald-500" size={18}/> 现金流推演表</h3>
                    <table className="w-full text-right text-xs">
                        <thead>
                            <tr className="text-slate-400 border-b border-slate-50">
                                <th className="text-left pb-2">项目 (10亿美元)</th>
                                {projectedFCFF.map(p => <th key={p.year} className="pb-2">Year {p.year}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td className="text-left py-2">营收</td>{projectedFCFF.map(p => <td key={p.year}>{formatB(p.rev)}</td>)}</tr>
                            <tr className="font-bold text-emerald-600 bg-emerald-50/30"><td className="text-left py-2">自由现金流 (FCFF)</td>{projectedFCFF.map(p => <td key={p.year}>{formatB(p.fcff)}</td>)}</tr>
                            <tr className="text-slate-400"><td className="text-left py-2">折现值 (PV)</td>{projectedFCFF.map(p => <td key={p.year}>{formatB(p.pvFcff)}</td>)}</tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 新增：分红分析卡片 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><Gift className="text-pink-500" size={18}/> 分红回报视角 (回报补充)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div>
                        <div className="text-xs text-slate-400 mb-1">当前股息率 (Yield)</div>
                        <div className="text-3xl font-black text-slate-800">{(data.dividends.yield * 100).toFixed(2)}%</div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 mb-1">派息率 (Payout Ratio)</div>
                        <div className="text-3xl font-black text-slate-800">{(data.dividends.payout_ratio * 100).toFixed(2)}%</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl">
                        <div className="text-xs text-slate-400 mb-2">近三年派息记录</div>
                        <div className="space-y-1">
                            {data.dividends.history.length > 0 ? data.dividends.history.map(h => (
                                <div key={h.year} className="flex justify-between text-xs">
                                    <span className="font-bold text-slate-600">{h.year}年</span>
                                    <span className="font-mono text-blue-600">${h.amount.toFixed(2)}/股</span>
                                </div>
                            )) : <div className="text-xs text-slate-300">暂无历史记录</div>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Valuation Bridge */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative">
                 <div className="flex flex-col md:flex-row justify-between items-end gap-6 relative z-10">
                    <div>
                        <div className="text-slate-400 mb-2">企业价值 (EV): {formatB(enterpriseValue)}</div>
                        <div className="text-6xl font-black tracking-tighter">${intrinsicValuePerShare.toFixed(2)}</div>
                        <div className="text-sm text-slate-400 mt-2">计算得出的每股内在价值</div>
                    </div>
                    <div className="text-right">
                        <div className={`font-bold px-4 py-2 rounded-full ${marginOfSafety > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {marginOfSafety > 0 ? `低估: 安全边际 +${marginOfSafety.toFixed(1)}%` : `高估: 风险 ${marginOfSafety.toFixed(1)}%`}
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
}
