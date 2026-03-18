import { useState } from 'react';
import { Search, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [market, setMarket] = useState('US');
  const [data, setData] = useState<{ symbol: string; price: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(`http://localhost:8000/api/quote?symbol=${symbol}&market=${market}`);
      const json = await res.json();
      
      if (json.error) {
        setError(json.error);
      } else {
        setData(json);
      }
    } catch (err) {
      setError("Failed to connect to backend server. Make sure it's running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" />
            Stock Screener
          </h1>
          <p className="text-gray-500 mt-2">Find and track your favorite stocks easily.</p>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Market</label>
              <select 
                value={market} 
                onChange={(e) => setMarket(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="US">US Market (yfinance)</option>
                <option value="CN">A-Shares / HK (akshare) - Coming Soon</option>
              </select>
            </div>
            
            <div className="flex-2 w-full md:w-auto">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ticker Symbol</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL"
                  className="w-full border border-gray-300 rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                />
              </div>
            </div>

            <button 
              onClick={fetchQuote}
              disabled={loading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold">Error</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        )}

        {data && (
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center mt-6 transition-all duration-300 ease-in-out">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{data.symbol}</h2>
            <div className="text-5xl font-black text-gray-900 tracking-tight">
              ${data.price?.toFixed(2) || 'N/A'}
            </div>
            <p className="text-gray-500 mt-4 text-sm">Real-time quote from Yahoo Finance</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;
