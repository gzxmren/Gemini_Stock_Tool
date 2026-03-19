from fastapi import APIRouter
import yfinance as yf
import httpx
import asyncio
import random
import math
from pydantic import BaseModel

router = APIRouter()

COMMON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Referer": "https://gu.qq.com/",
    "Accept": "*/*"
}

class DCFParams(BaseModel):
    fcf: float
    shares: float
    growth_rate: float
    discount_rate: float
    terminal_rate: float
    years: int = 5

async def get_exchange_rate(from_curr: str, to_currency: str):
    """获取实时汇率，例如从 CNY 转换到 USD"""
    if from_curr == to_currency:
        return 1.0
    try:
        # yfinance 汇率符号通常是 FROMTO=X
        ticker_sym = f"{from_curr}{to_currency}=X"
        rate_ticker = yf.Ticker(ticker_sym)
        return rate_ticker.fast_info.last_price
    except:
        # 降级处理：常见汇率硬编码备用
        rates = {"CNYUSD": 0.14, "HKDUSD": 0.128, "TWDUSD": 0.031}
        return rates.get(f"{from_curr}{to_currency}", 1.0)

@router.get("/dcf/professional")
async def get_professional_dcf_data(symbol: str):
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 1. 货币识别与汇率转换逻辑
        report_currency = info.get('financialCurrency', 'USD')
        trade_currency = info.get('currency', 'USD')
        fx_rate = 1.0
        
        if report_currency != trade_currency:
            fx_rate = await get_exchange_rate(report_currency, trade_currency)

        financials = ticker.financials
        cashflow = ticker.cashflow
        balance_sheet = ticker.balance_sheet
        
        def get_latest(df, key, default=0):
            try:
                val = float(df.loc[key].iloc[0])
                return 0 if math.isnan(val) else val
            except: return default

        # 2. 抓取原始数据并进行汇率折算
        revenue = get_latest(financials, 'Total Revenue') * fx_rate
        ebit = get_latest(financials, 'EBIT') * fx_rate
        tax_provision = get_latest(financials, 'Tax Provision') * fx_rate
        pretax_income = get_latest(financials, 'Pretax Income') * fx_rate
        tax_rate = (tax_provision / pretax_income) if pretax_income > 0 else 0.21

        da = (get_latest(cashflow, 'Depreciation And Amortization') or 
              (get_latest(cashflow, 'Depreciation') + get_latest(cashflow, 'Amortization', 0))) * fx_rate
        capex = abs(get_latest(cashflow, 'Capital Expenditure')) * fx_rate
        change_in_wc = get_latest(cashflow, 'Change In Working Capital') * fx_rate

        total_debt = get_latest(balance_sheet, 'Total Debt') * fx_rate
        cash = get_latest(balance_sheet, 'Cash And Cash Equivalents') * fx_rate
        minority_interest = get_latest(balance_sheet, 'Minority Interest') * fx_rate
        shares = info.get('sharesOutstanding', 0)

        # 3. 分红数据提取
        dividends = ticker.dividends
        div_history = []
        if not dividends.empty:
            # 提取过去三年的年度分红汇总
            annual_div = dividends.groupby(dividends.index.year).sum().tail(3)
            div_history = [{"year": int(y), "amount": float(v)} for y, v in annual_div.items()]

        return {
            "symbol": symbol,
            "currency_info": {
                "report_currency": report_currency,
                "trade_currency": trade_currency,
                "fx_rate": fx_rate
            },
            "income_statement": {
                "revenue": revenue,
                "ebit": ebit,
                "tax_rate": round(tax_rate, 4)
            },
            "cash_flow": {
                "da": da,
                "capex": capex,
                "change_in_wc": change_in_wc
            },
            "balance_sheet": {
                "total_debt": total_debt,
                "cash": cash,
                "minority_interest": minority_interest,
                "shares_outstanding": shares
            },
            "dividends": {
                "yield": info.get('dividendYield', 0),
                "payout_ratio": info.get('payoutRatio', 0),
                "history": div_history
            },
            "wacc_params": {
                "beta": info.get('beta', 1.0),
                "cost_of_equity": round(0.042 + info.get('beta', 1.0) * 0.055, 4),
                "cost_of_debt": 0.05
            }
        }
    except Exception as e:
        return {"error": f"Failed to extract DCF data: {str(e)}"}

@router.post("/dcf")
def calculate_dcf(params: DCFParams):
    # (保持原有计算逻辑不变)
    future_fcf = []
    current_fcf = params.fcf
    for year in range(1, params.years + 1):
        current_fcf *= (1 + params.growth_rate)
        discounted_fcf = current_fcf / ((1 + params.discount_rate) ** year)
        future_fcf.append(discounted_fcf)
    terminal_value = (current_fcf * (1 + params.terminal_rate)) / (params.discount_rate - params.terminal_rate)
    discounted_tv = terminal_value / ((1 + params.discount_rate) ** params.years)
    total_enterprise_value = sum(future_fcf) + discounted_tv
    intrinsic_value_per_share = total_enterprise_value / params.shares if params.shares > 0 else 0
    return {"intrinsic_value": round(intrinsic_value_per_share, 2), "total_ev": round(total_enterprise_value, 2)}

@router.get("/history")
async def get_history(symbol: str, market: str):
    if market.upper() == "US":
        ticker = yf.Ticker(symbol)
        info = ticker.info
        current_pe = info.get('forwardPE', 15)
        mock_history = [current_pe * (1 + (i - 2)*0.1) for i in range(5)]
        return {"symbol": symbol, "historical_pe": mock_history}
    return {"error": "Market history not supported yet"}

def get_simulated_historical_stats(current_val: float):
    if current_val == 0: return None
    low = round(current_val * random.uniform(0.4, 0.7), 2)
    high = round(current_val * random.uniform(1.5, 2.5), 2)
    mean = round((low + high) / 2 * random.uniform(0.8, 1.2), 2)
    percentile = int(((current_val - low) / (high - low)) * 100) if high > low else 50
    return {"low": low, "high": high, "mean": mean, "percentile": max(0, min(100, percentile))}

async def fetch_tencent_data(symbol: str):
    prefix = "sh" if symbol.startswith('6') else "sz"
    full_symbol = f"{prefix}{symbol}"
    url = f"https://qt.gtimg.cn/q={full_symbol}"
    async with httpx.AsyncClient(headers=COMMON_HEADERS, timeout=5.0) as client:
        response = await client.get(url)
        if response.status_code != 200: return None
        text = response.text
        parts = text.split('~')
        if len(parts) < 47: return None
        name, price, change_pct, pe, pb = parts[1], float(parts[3]), float(parts[32]), parts[39], parts[46]
        pe_val = float(pe) if pe != "-" else 0
        pb_val = float(pb) if pb != "-" else 0
        return {
            "symbol": f"{symbol} ({name})", "price": price, "currency": "¥",
            "metrics": {
                "change_pct": f"{change_pct}%", "pe": pe_val, "pb": pb_val,
                "pe_stats": get_simulated_historical_stats(pe_val),
                "pb_stats": get_simulated_historical_stats(pb_val)
            }
        }

@router.get("/quote")
async def get_quote(symbol: str, market: str):
    market = market.upper()
    try:
        if market == "US":
            ticker = yf.Ticker(symbol)
            info = ticker.info
            fast_info = ticker.fast_info
            pe_val, pb_val = info.get('forwardPE', 0), info.get('priceToBook', 0)
            return {
                "symbol": symbol, "price": fast_info.last_price, "currency": "$",
                "metrics": {
                    "change_pct": f"{((fast_info.last_price / fast_info.previous_close) - 1) * 100:.2f}%",
                    "pe": pe_val, "pb": pb_val,
                    "pe_stats": get_simulated_historical_stats(pe_val),
                    "pb_stats": get_simulated_historical_stats(pb_val),
                    "analyst_target": {"low": info.get('targetLowPrice'), "mean": info.get('targetMeanPrice'), "high": info.get('targetHighPrice')},
                    "dcf_baseline": {"fcf": info.get('freeCashflow', 0), "shares": info.get('sharesOutstanding', 1)}
                }
            }
        elif market == "CN": return await fetch_tencent_data(symbol)
    except Exception as e: return {"error": f"查询失败: 请稍后再试。"}
    return {"error": "暂不支持该市场"}
