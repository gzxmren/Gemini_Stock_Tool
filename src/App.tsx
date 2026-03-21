import { useState, useEffect } from 'react';
import { Search, TrendingUp, AlertCircle, Info, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Star, Calculator, Sparkles, Zap } from 'lucide-react';
import { AnalystConsensus } from './components/AnalystConsensus';
import { DCFSimulator } from './components/DCFSimulator';
import { ProfessionalDCF } from './components/ProfessionalDCF';
import { AIFundamentals } from './components/AIFundamentals';
import { InsightsStation } from './components/InsightsStation';
import { Sidebar } from './components/Sidebar';
import KLineChart from './components/KLineChart';

interface Stats {
    low: number;
    high: number;
    mean: number;
    percentile: number;
}

interface StockData {
    symbol: string;
    price: number;
    currency?: string;
    metrics?: {
        pe: number;
        pb: number;
        change_pct: string;
        pe_stats?: Stats;
        pb_stats?: Stats;
    }
}

function Gauge({ label, current, stats }: { label: string, current: number, stats?: Stats }) {
    if (!stats || !current) return null;
    const percentile = Math.min(100, Math.max(0, Number(stats.percentile) || 0));
    const isCheap = percentile < 30;
    const isExpensive = percentile > 70;

    return (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`${label === 'PE' ? 'bg-orange-50' : 'bg-purple-50'} p-2 rounded-lg`}>
                        {label === 'PE' ? <BarChart3 className="text-orange-500" size={20} /> : <Info className="text-purple-500" size={20} />}
                    </div>
                    <h3 className="font-bold text-slate-700">{label === 'PE' ? '市盈率 (PE)' : '市净率 (PB)'}</h3>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${isCheap ? 'bg-emerald-50 text-emerald-600' : isExpensive ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                    {percentile}% 分位 ({isCheap ? '极低' : isExpensive ? '偏高' : '适中'})
                </div>
            </div>
            <div className="flex items-baseline gap-2 mb-6">
                <span className="text-4xl font-black text-slate-800">{Number(current).toFixed(2)}</span>
                <span className="text-slate-400 text-sm font-medium">当前值</span>
            </div>
            <div className="relative pt-6 pb-2">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-400 w-1/3 opacity-50" />
                    <div className="h-full bg-orange-400 w-1/3 opacity-50" />
                    <div className="h-full bg-red-400 w-1/3 opacity-50" />
                </div>
                <div className="absolute top-4 transition-all duration-1000 ease-out" style={{ left: `${percentile}%`, transform: 'translateX(-50%)' }}>
                    <div className="flex flex-col items-center">
                        <div className="w-4 h-4 bg-slate-800 rounded-full border-2 border-white shadow-md mb-1" />
                        <span className="text-[10px] font-bold text-slate-800 bg-white px-1 shadow-sm border rounded">当前</span>
                    </div>
                </div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-4">
                <div>最低 {stats.low}</div>
                <div>均值 {stats.mean}</div>
                <div>最高 {stats.high}</div>
            </div>
        </div>
    );
}

export default function App() {
  const [symbol, setSymbol] = useState(localStorage.getItem('last_symbol') || 'AAPL');
  const [market, setMarket] = useState(localStorage.getItem('last_market') || 'US');
  const [data, setData] = useState<StockData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dcf' | 'fundamentals' | 'insights'>('dashboard');

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('last_symbol', symbol);
    localStorage.setItem('last_market', market);
    localStorage.setItem('last_tab', activeTab);
  }, [symbol, market, activeTab]);

  // Capture token from URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token');
    if (token) {
        localStorage.setItem('google_access_token', token);
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
        // Force state update for child components
        setLastUpdated(Date.now());
    }
  }, []);

  const fetchQuote = async (targetSymbol?: string, targetMarket?: string) => {
    const s = targetSymbol || symbol;
    const m = targetMarket || market;
    if (!s) return;
    setLoading(true);
    setError(null);
    // setData(null); // Remove this to avoid flashing during redirect refresh
    try {
      const res = await fetch(`http://localhost:8030/api/quote?symbol=${s}&market=${m}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else {
          setData(json);
          setSymbol(s);
          setMarket(m);
          setLastUpdated(Date.now());
      }
    } catch (err) {
      setError("无法连接到后端服务器。");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchQuote();
  }, []);

  const addToWatchlist = async () => {
      try {
          await fetch('http://localhost:8030/api/watchlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ symbol, market })
          });
          setLastUpdated(Date.now());
          alert("已加入自选列表");
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    if (!data) {
        if (market === 'CN') setSymbol('600519');
        else setSymbol('AAPL');
    }
  }, [market]);

  const isNegative = String(data?.metrics?.change_pct || '').startsWith('-');

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <Sidebar 
        currentSymbol={(String(data?.symbol || symbol)).split(' ')[0]} 
        onSelectStock={(s, m) => fetchQuote(s, m)} 
        lastUpdated={lastUpdated}
      />
      <main className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-5xl mx-auto">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-4xl font-extrabold text-slate-800 flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-lg"><TrendingUp className="text-white" size={32} /></div>
                    股票助手 <span className="text-blue-600 text-sm font-bold bg-blue-50 px-2 py-1 rounded ml-2">PRO</span>
                </h1>
                <p className="text-slate-500 mt-3 text-lg">横纵对比，深度掌握估值水位。</p>
            </div>
            
            {/* Tab 切换按钮 */}
            <div className="flex bg-slate-200/50 p-1 rounded-xl flex-wrap">
                <button 
                    onClick={() => setActiveTab('dashboard')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Activity size={16} /> 综合面板
                </button>
                <button 
                    onClick={() => setActiveTab('dcf')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'dcf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Calculator size={16} /> 专业 DCF
                </button>
                <button 
                    onClick={() => setActiveTab('fundamentals')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'fundamentals' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Sparkles size={16} /> AI 财报透视
                </button>
                <button 
                    onClick={() => setActiveTab('insights')} 
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'insights' ? 'bg-slate-900 text-green-400 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Zap size={16} /> 业绩情报站
                </button>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-xl p-8 mb-10 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-3">
                <label className="block text-sm font-bold text-slate-700 mb-2">市场</label>
                <select value={market} onChange={(e) => setMarket(e.target.value)} className="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium">
                  <option value="US">美股市场 (Yahoo Finance)</option>
                  <option value="CN">A股市场 (Tencent Finance)</option>
                </select>
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">股票代码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div>
                  <input type="text" value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder={market === 'CN' ? '600519' : 'AAPL'} className="w-full bg-slate-50 border-0 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono font-bold" />
                </div>
              </div>
              <div className="md:col-span-5 flex gap-3">
                <button onClick={() => fetchQuote()} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '开始深度分析'}
                </button>
                <button onClick={addToWatchlist} className="bg-white border border-slate-200 p-3 rounded-xl hover:bg-slate-50 transition-all active:scale-95">
                    <Star size={20} />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-xl mb-10 flex items-center gap-3">
              <AlertCircle size={20} /> <p className="font-medium">{error}</p>
            </div>
          )}

          {data && activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl p-10 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold mb-4 uppercase tracking-widest">实时分析</div>
                          <h2 className="text-3xl font-black text-slate-800 mb-1">{data.symbol}</h2>
                          <p className="text-slate-400 font-medium font-mono uppercase text-xs">{market} MARKET</p>
                      </div>
                      <div className="text-left md:text-right">
                          <div className={`text-xl font-bold mb-1 flex items-center md:justify-end gap-1 ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                              {isNegative ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />} {String(data.metrics?.change_pct || '0.00%')}
                          </div>
                          <div className="text-7xl font-black text-slate-900 tracking-tighter flex items-end md:justify-end">
                              <span className="text-3xl font-bold mb-3 mr-2 text-slate-400">{data.currency || '$'}</span>
                              {(Number(data.price) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                      </div>
                  </div>
              </div>

              {/* K-Line Chart */}
              <KLineChart symbol={symbol} market={market} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Gauge label="PE" current={data.metrics?.pe || 0} stats={data.metrics?.pe_stats} />
                  <Gauge label="PB" current={data.metrics?.pb || 0} stats={data.metrics?.pb_stats} />
              </div>

              <AnalystConsensus symbol={symbol} market={market} currentPrice={data.price} />

              <DCFSimulator symbol={symbol} market={market} currentPrice={data.price} />
            </div>
          )}

          {/* 专业 DCF Tab 渲染内容 */}
          {data && activeTab === 'dcf' && market === 'US' && (
              <ProfessionalDCF symbol={symbol} currentPrice={data.price} />
          )}
          
          {data && activeTab === 'dcf' && market !== 'US' && (
              <div className="p-10 text-center text-slate-500 bg-slate-100 rounded-3xl border border-slate-200 border-dashed">
                  专业 DCF 模型当前仅支持美股 (需获取完整的全市场财务报表数据)。
              </div>
          )}

          {data && activeTab === 'fundamentals' && (
              <AIFundamentals 
                symbol={symbol} 
                market={market} 
                lastUpdated={lastUpdated} 
              />
          )}

          {data && activeTab === 'insights' && (
              <InsightsStation 
                symbol={symbol} 
                market={market} 
              />
          )}

          {!data && !loading && !error && (
            <div className="text-center py-24 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <TrendingUp size={48} className="mx-auto text-slate-300 mb-4 opacity-20" />
              <p className="text-slate-400 font-medium text-lg">输入代码，深度洞察估值分位</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
