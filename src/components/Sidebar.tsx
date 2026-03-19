import { useState, useEffect, useCallback } from 'react';
import { Star, Trash2, TrendingUp, Activity } from 'lucide-react';

interface WatchlistItem {
    symbol: string;
    market: string;
    price?: number;
    change_pct?: string;
}

export function Sidebar({ onSelectStock, currentSymbol, lastUpdated }: { onSelectStock: (symbol: string, market: string) => void, currentSymbol: string, lastUpdated?: number }) {
    const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWatchlist = useCallback(async () => {
        try {
            const res = await fetch('http://localhost:8000/api/watchlist');
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            
            if (!Array.isArray(data)) {
                setWatchlist([]);
                return;
            }
            
            // 为了安全，我们先只显示基础数据，价格异步加载
            setWatchlist(data.map(item => ({ ...item })));
            
            // 异步获取价格
            for (const item of data) {
                try {
                    const priceRes = await fetch(`http://localhost:8000/api/quote?symbol=${item.symbol}&market=${item.market}`);
                    const priceData = await priceRes.json();
                    setWatchlist(prev => prev.map(p => 
                        p.symbol === item.symbol ? { ...p, price: priceData.price, change_pct: priceData.metrics?.change_pct } : p
                    ));
                } catch (e) {
                    console.error("Price fetch error", e);
                }
            }
        } catch (e) {
            console.error("Watchlist fetch error", e);
        } finally {
            setLoading(false);
        }
    }, []);

    const removeFromWatchlist = async (symbol: string) => {
        try {
            await fetch(`http://localhost:8000/api/watchlist/${symbol}`, { method: 'DELETE' });
            setWatchlist(prev => prev.filter(item => item.symbol !== symbol));
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchWatchlist();
        const interval = setInterval(fetchWatchlist, 60000); // 1分钟刷新一次
        return () => clearInterval(interval);
    }, [fetchWatchlist, lastUpdated]); // 监听 lastUpdated 变化立即刷新

    return (
        <aside className="w-72 bg-white border-r border-slate-100 flex flex-col h-full shrink-0">
            <div className="p-6 border-b border-slate-50">
                <div className="flex items-center justify-between mb-1">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Star className="text-amber-400 fill-amber-400" size={18} />
                        自选列表
                    </h2>
                </div>
                <p className="text-xs text-slate-400">实时追踪您关注的资产</p>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loading && watchlist.length === 0 ? (
                    <div className="py-10 text-center text-slate-300 text-sm italic">加载中...</div>
                ) : watchlist.length === 0 ? (
                    <div className="py-10 text-center">
                        <p className="text-slate-300 text-sm">暂无自选股</p>
                    </div>
                ) : (
                    watchlist.map((item) => {
                        const isUp = item.change_pct && !item.change_pct.startsWith('-');
                        const isActive = item.symbol === currentSymbol;
                        
                        return (
                            <div 
                                key={item.symbol}
                                onClick={() => onSelectStock(item.symbol, item.market)}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-blue-50 border-blue-100' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex-1 min-w-0 mr-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono font-bold text-sm truncate ${isActive ? 'text-blue-600' : 'text-slate-700'}`}>
                                            {item.symbol}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-300 uppercase">{item.market}</span>
                                    </div>
                                </div>

                                <div className="text-right flex items-center gap-2">
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold text-slate-800">
                                            {item.price ? item.price.toFixed(2) : '--'}
                                        </span>
                                        {item.change_pct && (
                                            <span className={`text-[10px] font-bold ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {isUp ? '+' : ''}{item.change_pct}
                                            </span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.symbol); }}
                                        className="p-1 hover:text-red-500 text-slate-200"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-4 border-t border-slate-100">
                <div className="bg-blue-600 rounded-2xl p-4 text-white">
                    <div className="text-[10px] font-bold opacity-70 mb-1 flex items-center gap-1">
                        <Activity size={10} /> 模拟盈亏 (PRO)
                    </div>
                    <div className="text-lg font-black">+¥12,450.00</div>
                </div>
            </div>
        </aside>
    );
}
