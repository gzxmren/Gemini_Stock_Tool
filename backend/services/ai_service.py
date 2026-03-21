import os
import json
import math
import datetime
import httpx
import asyncio
from typing import Optional, List, Tuple, Dict, Any
import yfinance as yf
import akshare as ak
from openai import OpenAI
import pandas as pd

class AIService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_base = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
        self.model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.timeout = 10.0 # Standard timeout for network calls

    def _clean_data(self, val):
        if val is None:
            return 0
        if isinstance(val, float) and math.isnan(val):
            return 0
        try:
            return float(val)
        except:
            return 0

    def get_available_dates(self, symbol: str, market: str) -> Dict[str, List[str]]:
        if market.upper() == 'CN':
            try:
                ak_symbol = self._get_ak_symbol(symbol)
                # 使用标准利润表获取日期，如果挂起则跳过
                try:
                    df = ak.stock_financial_report_sina(stock=ak_symbol, symbol="利润表")
                except:
                    df = None
                
                all_dates = []
                if df is not None and not df.empty:
                    for d in df['报告日'].tolist():
                        if len(d) == 8:
                            all_dates.append(f"{d[:4]}-{d[4:6]}-{d[6:]}")
                        else:
                            all_dates.append(d)
                
                # 如果标准库没拿到日期，尝试 yfinance 兜底
                if not all_dates:
                    yf_symbol = self._get_yf_symbol(symbol, market)
                    ticker = yf.Ticker(yf_symbol)
                    if ticker.quarterly_financials is not None:
                        all_dates = [d.strftime('%Y-%m-%d') for d in ticker.quarterly_financials.columns]

                # 业绩快报标记逻辑 (真正尝试获取最近的快报日期)
                q_dates = all_dates
                try:
                    # ak.stock_performance_report_sina 返回的是全量快报，查询较快
                    # 我们只取最近一年的快报日期作为参考
                    curr_year = datetime.datetime.now().year
                    df_exp = ak.stock_performance_report_sina(data=str(curr_year))
                    if df_exp is not None and not df_exp.empty:
                        # 匹配当前股票
                        stock_exp = df_exp[df_exp['股票代码'] == symbol]
                        if not stock_exp.empty:
                            exp_date = stock_exp.iloc[0]['公告日期'] # 格式通常是 YYYY-MM-DD
                            # 如果这个日期比我们已知的正式报表日期新，则加入
                            if exp_date not in q_dates:
                                q_dates.insert(0, f"{exp_date}(Express)")
                except:
                    pass # 如果快报获取失败，不影响主流程
                
                a_dates = [d for d in q_dates if d.endswith("-12-31") or "(Express)" in d]
                
                return {
                    "quarterly": q_dates,
                    "annual": a_dates
                }
            except Exception as e:
                print(f"Error fetching CN available dates for {symbol}: {e}")
                return {"quarterly": [], "annual": []}

        yf_symbol = self._get_yf_symbol(symbol, market)
        ticker = yf.Ticker(yf_symbol)
        
        try:
            q_dates = [d.strftime('%Y-%m-%d') for d in ticker.quarterly_financials.columns] if ticker.quarterly_financials is not None else []
            a_dates = [d.strftime('%Y-%m-%d') for d in ticker.financials.columns] if ticker.financials is not None else []
        except:
            q_dates, a_dates = [], []
            
        return {
            "quarterly": q_dates,
            "annual": a_dates
        }

    def _get_ak_symbol(self, symbol: str) -> str:
        """Get Sina-style symbol with prefix (e.g., sh600519)."""
        symbol = symbol.strip().upper()
        if symbol.startswith('6') or symbol.startswith('9') or symbol.startswith('11'):
            return f"sh{symbol}"
        else:
            return f"sz{symbol}"

    def _get_yf_symbol(self, symbol: str, market: str) -> str:
        symbol = symbol.upper()
        if market.upper() == 'CN':
            if symbol.startswith('6') or symbol.startswith('9'):
                return f"{symbol}.SS"
            else:
                return f"{symbol}.SZ"
        return symbol

    def _fetch_cn_financials(self, symbol: str, target_date: Optional[str] = None, compare_date: Optional[str] = None) -> Tuple[List[str], Dict[str, List[float]]]:
        """Fetch and normalize A-share financial data from AkShare."""
        ak_symbol = self._get_ak_symbol(symbol)
        
        try:
            # 1. 获取标准财务报表
            is_stmt = ak.stock_financial_report_sina(stock=ak_symbol, symbol="利润表")
            bs = ak.stock_financial_report_sina(stock=ak_symbol, symbol="资产负债表")
            cf = ak.stock_financial_report_sina(stock=ak_symbol, symbol="现金流量表")
            
            # 2. 预处理日期
            def normalize_df_dates(df):
                if df is not None and not df.empty:
                    df['报告日_norm'] = df['报告日'].apply(lambda d: f"{d[:4]}-{d[4:6]}-{d[6:]}" if len(d) == 8 else d)
                    df.set_index('报告日_norm', inplace=True)
                return df
                
            is_stmt = normalize_df_dates(is_stmt)
            bs = normalize_df_dates(bs)
            cf = normalize_df_dates(cf)
            
            available_dates = is_stmt.index.tolist() if is_stmt is not None else []
            
            # 3. 处理 Express (业绩快报) 逻辑
            is_express_target = target_date and "(Express)" in target_date
            express_data = None
            
            if is_express_target:
                try:
                    curr_year = datetime.datetime.now().year
                    df_exp_all = ak.stock_performance_report_sina(data=str(curr_year))
                    if df_exp_all is not None and not df_exp_all.empty:
                        matched = df_exp_all[df_exp_all['股票代码'] == symbol]
                        if not matched.empty:
                            row = matched.iloc[0]
                            express_data = {
                                "revenue": self._clean_data(row.get('营业收入', 0)),
                                "net_income": self._clean_data(row.get('净利润', 0)),
                                "eps": self._clean_data(row.get('每股收益', 0))
                            }
                except:
                    pass

            # 4. 选择基准日期
            selected_dates = []
            if target_date and compare_date:
                t_match = target_date.replace('(Express)', '')
                c_match = compare_date.replace('(Express)', '')
                # 寻找最接近的可用正式报表日期作为底图
                def find_nearest(d):
                    for avail in available_dates:
                        if avail <= d: return avail
                    return available_dates[0] if available_dates else d
                selected_dates = [find_nearest(t_match), find_nearest(c_match)]
            elif target_date:
                t_match = target_date.replace('(Express)', '')
                def find_idx(d):
                    for i, avail in enumerate(available_dates):
                        if avail <= d: return i
                    return 0
                idx = find_idx(t_match)
                selected_dates = available_dates[idx:idx+4]
            else:
                selected_dates = available_dates[:4]
                
            def get_val(df, date, col):
                try:
                    if df is not None and date in df.index and col in df.columns:
                        return self._clean_data(df.loc[date][col])
                    return 0.0
                except: return 0.0
                    
            # 5. 组装数据并应用 Express 覆盖
            revenue = [get_val(is_stmt, d, '营业总收入') for d in selected_dates]
            net_income = [get_val(is_stmt, d, '净利润') for d in selected_dates]
            gross_profit = [get_val(is_stmt, d, '营业利润') for d in selected_dates]
            total_debt = [get_val(bs, d, '负债合计') for d in selected_dates]
            
            ocf_net = [get_val(cf, d, '经营活动产生的现金流量净额') for d in selected_dates]
            icf_net = [get_val(cf, d, '投资活动产生的现金流量净额') for d in selected_dates]
            fcf = [o + i for o, i in zip(ocf_net, icf_net)]
            
            # 如果是快报，覆盖第一项
            if is_express_target and express_data and len(revenue) > 0:
                revenue[0] = express_data["revenue"]
                net_income[0] = express_data["net_income"]
                # 快报通常不含现金流，维持原值或设为0

            final_dates = [target_date] + selected_dates[1:] if is_express_target else selected_dates
            
            return final_dates, {
                "revenue": revenue,
                "net_income": net_income,
                "gross_profit": gross_profit,
                "total_debt": total_debt,
                "fcf": fcf
            }
            
        except Exception as e:
            print(f"Error in _fetch_cn_financials for {symbol}: {e}")
            # 最终兜底：使用 yfinance
            return self._fetch_yf_fallback(symbol, market, target_date, compare_date)

    def _fetch_yf_fallback(self, symbol: str, market: str, target_date: Optional[str] = None, compare_date: Optional[str] = None) -> Tuple[List[str], Dict[str, List[float]]]:
        """A-share fallback using yfinance (which is more stable in terms of not hanging)."""
        yf_symbol = self._get_yf_symbol(symbol, market)
        ticker = yf.Ticker(yf_symbol)
        q_fin = ticker.quarterly_financials
        if q_fin is None or q_fin.empty:
            q_fin = ticker.financials
            
        if q_fin is None or q_fin.empty:
            raise Exception("No financial data available via any source.")
            
        dates = [d.strftime('%Y-%m-%d') for d in q_fin.columns[:4]]
        data = {
            "revenue": [self._clean_data(v) for v in q_fin.loc['Total Revenue']] if 'Total Revenue' in q_fin.index else [0]*len(dates),
            "net_income": [self._clean_data(v) for v in q_fin.loc['Net Income']] if 'Net Income' in q_fin.index else [0]*len(dates),
            "gross_profit": [self._clean_data(v) for v in q_fin.loc['Gross Profit']] if 'Gross Profit' in q_fin.index else [0]*len(dates),
            "total_debt": [0]*len(dates), # yf balance sheet often missing for CN
            "fcf": [0]*len(dates)
        }
        return dates, data

    def fetch_financial_data(self, symbol: str, market: str, target_date: Optional[str] = None, compare_date: Optional[str] = None) -> Tuple[List[str], Dict[str, List[float]]]:
        if market.upper() == 'CN':
            return self._fetch_cn_financials(symbol, target_date, compare_date)
            
        yf_symbol = self._get_yf_symbol(symbol, market)
        ticker = yf.Ticker(yf_symbol)
        
        q_financials = ticker.quarterly_financials
        q_cashflow = ticker.quarterly_cashflow
        q_balance_sheet = ticker.quarterly_balance_sheet

        if q_financials is None or q_financials.empty:
             q_financials = ticker.financials
             q_cashflow = ticker.cashflow
             q_balance_sheet = ticker.balance_sheet
             
        if q_financials is None or q_financials.empty:
             raise Exception(f"无法获取 {yf_symbol} 的财务报表数据。")

        available_dates = [d.strftime('%Y-%m-%d') for d in q_financials.columns]
        
        selected_cols = []
        dates = []
        if compare_date and target_date:
            def find_idx(d_str):
                for i, avail in enumerate(available_dates):
                    if avail <= d_str: return i
                return len(available_dates) - 1
            t_idx, c_idx = find_idx(target_date), find_idx(compare_date)
            selected_cols = [q_financials.columns[t_idx], q_financials.columns[c_idx]]
            dates = [available_dates[t_idx], available_dates[c_idx]]
        elif target_date:
            def find_idx(d_str):
                for i, avail in enumerate(available_dates):
                    if avail <= d_str: return i
                return 0
            start_idx = find_idx(target_date)
            end_idx = min(start_idx + 4, len(available_dates))
            selected_cols = q_financials.columns[start_idx:end_idx]
            dates = available_dates[start_idx:end_idx]
        else:
            selected_cols = q_financials.columns[:4]
            dates = available_dates[:4]

        def get_row_data(df, row_name):
            try:
                if df is not None and row_name in df.index:
                    return [self._clean_data(df.loc[row_name][col]) for col in selected_cols]
                return [0] * len(selected_cols)
            except: return [0] * len(selected_cols)

        data = {
            "revenue": get_row_data(q_financials, 'Total Revenue'),
            "net_income": get_row_data(q_financials, 'Net Income'),
            "gross_profit": get_row_data(q_financials, 'Gross Profit'),
            "total_debt": get_row_data(q_balance_sheet, 'Total Debt'),
            "fcf": [o + c for o, c in zip(get_row_data(q_cashflow, 'Operating Cash Flow'), get_row_data(q_cashflow, 'Capital Expenditure'))]
        }
        return dates, data

    def generate_analysis(self, symbol: str, market: str, dates: List[str], data: Dict[str, List[float]], target_date: Optional[str] = None, compare_date: Optional[str] = None) -> Dict[str, Any]:
        if not self.api_key: raise Exception("DEEPSEEK_API_KEY not found.")
        client = OpenAI(api_key=self.api_key, base_url=self.api_base)

        data_md = f"### Financial Data for {symbol} ({len(dates)} Periods)\n\n| Metric | " + " | ".join(dates) + " |\n| --- | " + " | ".join(["---"] * len(dates)) + " |\n"
        data_md += f"| Total Revenue | " + " | ".join([f"{v:,.0f}" for v in data['revenue']]) + " |\n"
        data_md += f"| Net Income | " + " | ".join([f"{v:,.0f}" for v in data['net_income']]) + " |\n"
        data_md += f"| Free Cash Flow | " + " | ".join([f"{v:,.0f}" for v in data['fcf']]) + " |\n"

        is_preliminary = any("(Express)" in d for d in dates)
        express_note = "【注意：当前包含业绩快报数据，并非审计后的正式报表，请在分析中提及此不确定性。】" if is_preliminary else ""

        if target_date and compare_date:
             prompt_instruction = f"对比分析 {symbol} 在 {dates[0]} 和 {dates[1]} 的表现。{express_note}"
        elif target_date:
             prompt_instruction = f"以 {dates[0]} 为基准进行历史回顾分析。{express_note} 严禁提及该日期之后的任何事件。"
        else:
             prompt_instruction = f"基于最新财报数据评估基本面。{express_note}"

        prompt = f"Act as a senior equity analyst. {prompt_instruction}\n\n{data_md}\n\nReturn JSON ONLY with keys: highlights(arr), lowlights(arr), trends(arr), health(str), risks(arr), conclusion(str), score(int)."
        
        response = client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "system", "content": "You are a pro analyst. Use Simplified Chinese."}, {"role": "user", "content": prompt}],
            stream=False
        )
        
        content = response.choices[0].message.content.strip()
        if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
        analysis_json = json.loads(content[content.find("{"):content.rfind("}")+1])
        analysis_json["analysis_period"] = " vs ".join(dates) if compare_date else f"Snapshot as of {dates[0]}"
        analysis_json["is_preliminary"] = is_preliminary
        analysis_json["confidence"] = 75 if is_preliminary else 92
        return analysis_json

    def get_fallback_analysis(self, error_msg: str) -> Dict[str, Any]:
        return {"highlights": ["AI 分析暂时不可用"], "risks": [f"Error: {error_msg}"], "score": 50, "conclusion": "请检查网络或 API 配置。"}
