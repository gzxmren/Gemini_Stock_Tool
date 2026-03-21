from fastapi import APIRouter, Depends, HTTPException
import yfinance as yf
import httpx
import asyncio
import random
import math
import json
from typing import Optional, Dict, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from concurrent.futures import ThreadPoolExecutor

from database import get_db
import models
from services.ai_service import AIService

router = APIRouter()
executor = ThreadPoolExecutor(max_workers=10)

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

# 统一前端和后端的字段命名
class DCFParams(BaseModel):
    fcf: float
    shares: float
    growth_rate: float = Field(..., alias="growth_rate")
    discount_rate: float = Field(..., alias="discount_rate")
    terminal_rate: float = Field(..., alias="terminal_rate")
    years: int = 5

    class Config:
        populate_by_name = True

def get_simulated_historical_stats(current_val: float):
    if current_val <= 0: return {"low": 0, "high": 0, "mean": 0, "percentile": 0}
    low = current_val * 0.6
    high = current_val * 1.4
    mean = (low + high) / 2
    percentile = random.randint(10, 90)
    return {"low": round(low, 2), "high": round(high, 2), "mean": round(mean, 2), "percentile": percentile}

async def fetch_tencent_single(symbol: str):
    prefix = "sh" if symbol.startswith('6') or symbol.startswith('9') else "sz"
    url = f"http://qt.gtimg.cn/q={prefix}{symbol}"
    try:
        async with httpx.AsyncClient(headers=COMMON_HEADERS, timeout=3.0) as client:
            response = await client.get(url)
            data = response.text.split('~')
            if len(data) < 40: return None
            return {
                "name": data[1],
                "price": float(data[3]),
                "pe": float(data[39]) if data[39] != "" else 0,
                "pb": float(data[45]) if len(data) > 45 and data[45] != "" else 0,
                "change_pct": f"{data[32]}%"
            }
    except: return None

def fetch_yf_info_sync(ticker_obj):
    return ticker_obj.info, ticker_obj.fast_info

@router.get("/quote")
async def get_quote(symbol: str, market: str, db: Session = Depends(get_db)):
    market = market.upper()
    symbol = symbol.upper()
    try:
        if market == 'CN':
            t_data = await fetch_tencent_single(symbol)
            if not t_data: raise Exception("Market data unreachable")
            return {
                "symbol": f"{symbol} ({t_data['name']})",
                "price": t_data['price'],
                "currency": "¥",
                "metrics": {
                    "change_pct": t_data['change_pct'],
                    "pe": t_data['pe'], "pb": t_data['pb'],
                    "pe_stats": get_simulated_historical_stats(t_data['pe']),
                    "pb_stats": get_simulated_historical_stats(t_data['pb'])
                }
            }
        else:
            ticker = yf.Ticker(symbol)
            loop = asyncio.get_event_loop()
            info, fast_info = await loop.run_in_executor(executor, fetch_yf_info_sync, ticker)
            pe_val, pb_val = info.get('forwardPE', 0), info.get('priceToBook', 0)
            change_val = ((fast_info.last_price / fast_info.previous_close) - 1) * 100 if fast_info.previous_close else 0
            return {
                "symbol": symbol,
                "price": fast_info.last_price,
                "currency": "$",
                "metrics": {
                    "change_pct": f"{change_val:.2f}%",
                    "pe": pe_val, "pb": pb_val,
                    "pe_stats": get_simulated_historical_stats(pe_val),
                    "pb_stats": get_simulated_historical_stats(pb_val)
                }
            }
    except Exception as e:
        return {"error": str(e)}

@router.get("/dcf/baseline")
async def get_dcf_baseline(symbol: str, market: str):
    if market.upper() != "US": return {"fcf": 0, "shares": 1}
    try:
        ticker = yf.Ticker(symbol)
        loop = asyncio.get_event_loop()
        info, _ = await loop.run_in_executor(executor, fetch_yf_info_sync, ticker)
        return {"fcf": info.get('freeCashflow', 0) or 0, "shares": info.get('sharesOutstanding', 1) or 1}
    except Exception as e:
        return {"fcf": 0, "shares": 1, "error": str(e)}

@router.get("/analyst/targets")
async def get_analyst_targets(symbol: str, market: str):
    if market.upper() != "US": return {"low": 0, "mean": 0, "high": 0}
    try:
        ticker = yf.Ticker(symbol)
        loop = asyncio.get_event_loop()
        info, _ = await loop.run_in_executor(executor, fetch_yf_info_sync, ticker)
        return {"low": info.get('targetLowPrice', 0), "mean": info.get('targetMeanPrice', 0), "high": info.get('targetHighPrice', 0)}
    except Exception as e:
        return {"low": 0, "mean": 0, "high": 0, "error": str(e)}

@router.get("/quotes")
async def get_quotes(symbols: str, markets: Optional[str] = None):
    if not symbols: return {}
    symbol_list = symbols.split(',')
    market_list = markets.split(',') if markets else ['US'] * len(symbol_list)
    results, tasks = {}, []
    cn_indices = [i for i, m in enumerate(market_list) if m.upper() == 'CN']
    if cn_indices:
        cn_symbols = [symbol_list[i] for i in cn_indices]
        formatted = ",".join([f"{'sh' if s.startswith('6') or s.startswith('9') else 'sz'}{s}" for s in cn_symbols])
        async def fetch_cn_batch():
            try:
                async with httpx.AsyncClient(headers=COMMON_HEADERS, timeout=3.0) as client:
                    resp = await client.get(f"http://qt.gtimg.cn/q={formatted}")
                    if resp.status_code == 200:
                        for line in resp.text.split(';\n'):
                            d = line.split('~')
                            if len(d) > 32: results[d[2]] = {"price": float(d[3]), "change_pct": f"{d[32]}%"}
            except: pass
        tasks.append(fetch_cn_batch())
    us_symbols = [symbol_list[i] for i, m in enumerate(market_list) if m.upper() == 'US']
    if us_symbols:
        async def fetch_us_batch():
            try:
                tickers = yf.Tickers(" ".join(us_symbols))
                def process_us():
                    for s in us_symbols:
                        try:
                            f = tickers.tickers[s].fast_info
                            results[s] = {"price": f.last_price, "change_pct": f"{((f.last_price / f.previous_close) - 1) * 100:.2f}%"}
                        except: results[s] = {"price": None, "change_pct": None}
                await asyncio.get_event_loop().run_in_executor(executor, process_us)
            except: pass
        tasks.append(fetch_us_batch())
    await asyncio.gather(*tasks)
    return results

@router.get("/kline")
async def get_kline(symbol: str, market: str, interval: str = "1d"):
    market = market.upper()
    try:
        if market == "US":
            ticker = yf.Ticker(symbol)
            hist = await asyncio.get_event_loop().run_in_executor(executor, lambda: ticker.history(period="2y", interval="1d"))
            return [[idx.strftime('%Y-%m-%d'), float(row['Open']), float(row['Close']), float(row['Low']), float(row['High']), int(row['Volume'])] for idx, row in hist.iterrows()]
        else:
            prefix = "sh" if symbol.startswith('6') or symbol.startswith('9') else "sz"
            clean_s = symbol.replace('SH','').replace('SZ','').replace('sh','').replace('sz','')
            url = f"http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol={prefix}{clean_s}&scale=240&ma=no&datalen=1024"
            async with httpx.AsyncClient(headers=COMMON_HEADERS, timeout=5.0) as client:
                resp = await client.get(url)
                return [[item['day'], float(item['open']), float(item['close']), float(item['low']), float(item['high']), int(item['volume'])] for item in resp.json()]
    except Exception as e:
        return {"error": str(e)}

@router.post("/dcf")
def calculate_dcf(params: DCFParams):
    try:
        if params.shares <= 0: return {"fair_value": 0, "upside": 0}
        future_fcf = []
        current_fcf = params.fcf
        for _ in range(1, params.years + 1):
            current_fcf *= (1 + params.growth_rate)
            future_fcf.append(current_fcf)
        
        denom = (params.discount_rate - params.terminal_rate)
        if denom <= 0: denom = 0.01 # 防止除零或折现率过低
        
        terminal_value = (future_fcf[-1] * (1 + params.terminal_rate)) / denom
        present_values = [fcf / (1 + params.discount_rate)**i for i, fcf in enumerate(future_fcf, 1)]
        present_terminal_value = terminal_value / (1 + params.discount_rate)**params.years
        total_pv = sum(present_values) + present_terminal_value
        fair_value = total_pv / params.shares
        return {"fair_value": fair_value, "upside": 0}
    except:
        return {"fair_value": 0, "upside": 0}

@router.get("/dcf/professional")
async def get_professional_dcf_data(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        loop = asyncio.get_event_loop()
        
        def fetch_all_financial_data():
            """
            在单线程中顺序获取所有报表，避免多线程请求雅虎导致被封 IP 或竞态错误。
            """
            try:
                # 1. 利润表 (优先年报，回退季报)
                income = ticker.financials
                if income is None or income.empty:
                    income = ticker.quarterly_financials
                
                # 2. 资产负债表
                balance = ticker.balance_sheet
                if balance is None or balance.empty:
                    balance = ticker.quarterly_balance_sheet
                
                # 3. 现金流量表
                cashflow = ticker.cashflow
                if cashflow is None or cashflow.empty:
                    cashflow = ticker.quarterly_cashflow
                
                # 4. 基础信息 (用于股本)
                info = ticker.info
                
                return income, balance, cashflow, info
            except Exception as e:
                raise Exception(f"Yahoo Finance 请求失败: {str(e)}")
            
        income, balance, cashflow, info = await loop.run_in_executor(executor, fetch_all_financial_data)
        
        # --- 汇率转换逻辑 ---
        report_cur = info.get('financialCurrency', 'USD')
        trade_cur = info.get('currency', 'USD')
        fx_rate = 1.0
        
        if report_cur != trade_cur:
            try:
                fx_ticker = f"{report_cur}{trade_cur}=X"
                # 简单缓存或快速获取汇率
                fx_data = yf.Ticker(fx_ticker).fast_info
                fx_rate = fx_data.last_price
            except:
                # 常见硬编码兜底 (TWD -> USD)
                if report_cur == "TWD" and trade_cur == "USD": fx_rate = 0.031
                elif report_cur == "HKD" and trade_cur == "USD": fx_rate = 0.128
                elif report_cur == "CNY" and trade_cur == "USD": fx_rate = 0.14

        def safe_get_list(df, keywords: List[str]):
            if df is None or df.empty: return [0]*4
            # 1. 优先完全匹配
            for k in keywords:
                if k in df.index: 
                    vals = df.loc[k].tolist()
                    return [float(v) * fx_rate if v is not None and not math.isnan(float(v)) else 0 for v in vals[:4]]
            # 2. 模糊匹配
            for idx_name in df.index:
                idx_lower = str(idx_name).lower()
                for kw in keywords:
                    if kw.lower() in idx_lower:
                        vals = df.loc[idx_name].tolist()
                        return [float(v) * fx_rate if v is not None and not math.isnan(float(v)) else 0 for v in vals[:4]]
            return [0]*4

        def safe_get_val(df, keywords: List[str]):
            if df is None or df.empty: return 0
            for k in keywords:
                if k in df.index: 
                    vals = df.loc[k].tolist()
                    if vals and vals[0] is not None and not math.isnan(float(vals[0])):
                        return float(vals[0]) * fx_rate
            for idx_name in df.index:
                idx_lower = str(idx_name).lower()
                for kw in keywords:
                    if kw.lower() in idx_lower:
                        vals = df.loc[idx_name].tolist()
                        if vals and vals[0] is not None and not math.isnan(float(vals[0])):
                            return float(vals[0]) * fx_rate
            return 0

        if income is None or income.empty:
            raise Exception("无法从 Yahoo Finance 获取利润表数据")

        ebit_data = safe_get_list(income, ['EBIT', 'Operating Income', 'OperatingProfit'])
        if all(v == 0 for v in ebit_data):
            ebit_data = safe_get_list(income, ['Gross Profit', 'Total Revenue'])

        # 补全专业 DCF 需要的辅助维度
        try:
            # 股息率通常已经是比例，不需要乘以汇率
            div_yield = info.get('dividendYield', 0) or 0
            # 特殊处理：如果 div_yield 异常大 (可能是百分比格式或币种错误)，强制限制
            if div_yield > 1.0: div_yield = div_yield / 100.0
            
            payout_ratio = info.get('payoutRatio', 0) or 0
            beta = info.get('beta', 1.0) or 1.0
        except:
            div_yield, payout_ratio, beta = 0, 0, 1.0

        return {
            "symbol": symbol,
            "currency_info": {
                "report_currency": report_cur,
                "trade_currency": trade_cur,
                "fx_rate": fx_rate
            },
            "income_statement": {
                "revenue": safe_get_list(income, ['Total Revenue', 'Operating Revenue', 'Revenue'])[0],
                "ebit": ebit_data[0],
                "tax_rate": 0.25
            },
            "cash_flow": {
                "da": safe_get_list(cashflow, ['Amortization', 'Depreciation And Amortization', 'Depreciation'])[0],
                "capex": abs(safe_get_list(cashflow, ['Capital Expenditure', 'Net PPE PurchaseAndSale', 'Investing Cash Flow'])[0]),
                "change_in_wc": 0
            },
            "balance_sheet": {
                "total_debt": safe_get_val(balance, ['Total Debt', 'Long Term Debt', 'Net Debt']),
                "cash": safe_get_val(balance, ['Cash And Cash Equivalents', 'Cash Cash Equivalents And Short Term Investments', 'Cash']),
                "minority_interest": 0,
                "shares_outstanding": (info.get('sharesOutstanding') or 1)
            },
            "dividends": {
                "yield": div_yield,
                "payout_ratio": payout_ratio,
                "history": []
            },
            "wacc_params": {
                "beta": beta,
                "cost_of_equity": 0.08 + beta * 0.05,
                "cost_of_debt": 0.05
            },
            "trends": {
                "revenue": safe_get_list(income, ['Total Revenue', 'Operating Revenue', 'Revenue']),
                "ebit": ebit_data
            }
        }
    except Exception as e:
        return {"error": f"DCF 数据映射失败: {str(e)}"}
