import React, { useState, useEffect, useRef } from 'react';
import { 
    RefreshCcw,
    AlertCircle,
    TrendingUp
} from 'lucide-react';
import { ControlBar } from './AIFundamentals/ControlBar';
import { AnalysisReport } from './AIFundamentals/AnalysisReport';
import { LandingPage } from './AIFundamentals/LandingPage';

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

interface AvailableDates {
    quarterly: string[];
    annual: string[];
    cached_dates?: string[];
}

interface AIFundamentalsProps {
    symbol: string;
    market: string;
    lastUpdated?: number;
}

export const AIFundamentals: React.FC<AIFundamentalsProps> = ({ symbol, market, lastUpdated }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('google_access_token'));
    const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingDates, setLoadingDates] = useState<boolean>(false);
    const [exporting, setExporting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [localIsCached, setLocalIsCached] = useState<boolean>(false);

    // Time Machine States
    const [availableDates, setAvailableDates] = useState<AvailableDates | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [compareDate, setCompareDate] = useState<string>('');
    const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
    const [periodType, setPeriodType] = useState<'quarterly' | 'annual'>('quarterly');

    const lastSymbol = useRef<string>('');

    // 1. Symbol Change
    useEffect(() => {
        if (symbol !== lastSymbol.current) {
            lastSymbol.current = symbol;
            setAnalysis(null);
            setLocalIsCached(false);
            setError(null);
            setSelectedDate('');
            setCompareDate('');
            fetchDates();
        }
    }, [symbol, market]);

    const fetchDates = async () => {
        setLoadingDates(true);
        try {
            const res = await fetch(`http://localhost:8030/api/analysis/dates?symbol=${symbol}&market=${market}`);
            if (!res.ok) throw new Error("Failed to fetch dates");
            const data = await res.json();
            setAvailableDates(data);
            
            const dates = periodType === 'quarterly' ? data.quarterly : data.annual;
            if (dates && dates.length > 0) {
                // 如果后端返回了 cached_dates，优先选中最新的有缓存的日期
                if (data.cached_dates && data.cached_dates.length > 0) {
                    setSelectedDate(data.cached_dates[0]);
                    setLocalIsCached(true);
                } else {
                    setSelectedDate(dates[0]);
                }
            }
        } catch (e) {
            console.error("Failed to fetch dates", e);
        } finally {
            setLoadingDates(false);
        }
    };

    // 3. Auto-load check
    useEffect(() => {
        if (symbol && selectedDate) {
            fetchAnalysis(false, true); 
        }
    }, [symbol, market, selectedDate, isCompareMode, compareDate, lastUpdated]);

    const fetchAnalysis = async (forceRefresh: boolean = false, checkOnly: boolean = false) => {
        if (!checkOnly) setLoading(true);
        setError(null);
        try {
            const url = new URL(`http://localhost:8030/api/analysis/fundamentals`);
            url.searchParams.append('symbol', symbol);
            url.searchParams.append('market', market);
            if (token) url.searchParams.append('token', token);
            if (forceRefresh) url.searchParams.append('refresh', 'true');
            if (checkOnly) url.searchParams.append('check_only', 'true');
            
            const target = selectedDate;
            if (target) url.searchParams.append('target_date', target);
            if (isCompareMode && compareDate) url.searchParams.append('compare_date', compareDate);
            
            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (response.status === 200) {
                setAnalysis(data);
                setLocalIsCached(true);
            } else {
                setLocalIsCached(false);
                if (checkOnly) {
                    setAnalysis(null);
                } else {
                    setError(data.detail || data.error || '分析请求失败');
                }
            }
        } catch (err) {
            setLocalIsCached(false);
            if (!checkOnly) setError('无法获取 AI 分析报告，请检查后端连接。');
        } finally {
            if (!checkOnly) setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('google_access_token');
        setToken(null);
        setAnalysis(null);
    };

    const handleExport = async (format: 'pdf' | 'markdown' = 'pdf') => {
        if (exporting) return;
        setExporting(true);
        try {
            const url = `http://localhost:8030/api/analysis/export?symbol=${symbol}&market=${market}&format=${format}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('导出失败');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            const extension = format === 'markdown' ? 'md' : 'pdf';
            a.download = `${symbol}_AI_Report_${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err) {
            alert('导出报告失败，请稍后重试。');
        } finally {
            setExporting(false);
        }
    };

    if (loadingDates) {
        return (
            <div className="bg-white border border-slate-100 rounded-3xl p-12 shadow-xl flex flex-col items-center justify-center min-h-[400px]">
                <RefreshCcw className="animate-spin text-blue-600 mb-4" size={48} />
                <span className="text-slate-500 font-bold">正在同步历史财报版本...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            <ControlBar 
                periodType={periodType}
                setPeriodType={setPeriodType}
                availableDates={availableDates}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                isCompareMode={isCompareMode}
                setIsCompareMode={setIsCompareMode}
                compareDate={compareDate}
                setCompareDate={setCompareDate}
                loading={loading}
                fetchAnalysis={fetchAnalysis}
                cached_dates={availableDates?.cached_dates || []}
            />

            {loading && !analysis ? (
                <div className="bg-white border border-slate-100 rounded-3xl p-20 shadow-xl flex flex-col items-center">
                    <TrendingUp className="animate-bounce text-blue-600 mb-6" size={64} />
                    <span className="text-xl font-black text-slate-800">正在调取历史数据并深度透视...</span>
                    <div className="mt-12 w-full space-y-6 max-w-2xl">
                        <div className="h-8 bg-slate-100 rounded-lg w-1/3 animate-pulse" />
                        <div className="h-24 bg-slate-50 rounded-xl w-full animate-pulse" />
                        <div className="h-8 bg-slate-100 rounded-lg w-1/4 animate-pulse" />
                        <div className="h-40 bg-slate-50 rounded-xl w-full animate-pulse" />
                    </div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center shadow-inner">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-red-800 mb-2">分析请求失败</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            ) : analysis ? (
                <AnalysisReport 
                    symbol={symbol}
                    analysis={analysis}
                    loading={loading}
                    isCompareMode={isCompareMode}
                    exporting={exporting}
                    handleExport={handleExport}
                    handleLogout={handleLogout}
                />
            ) : (
                <LandingPage localIsCached={localIsCached} />
            )}
        </div>
    );
};
