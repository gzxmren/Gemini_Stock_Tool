import os
import json
import datetime
from typing import Dict, Any, List
import yfinance as yf
import akshare as ak
from openai import OpenAI

class InsightsService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_base = os.getenv("DEEPSEEK_API_BASE", "https://api.deepseek.com")
        self.model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    def get_cn_insights(self, symbol: str) -> Dict[str, Any]:
        """抓取 A 股业绩快报或业绩预告"""
        signals = []
        curr_year = datetime.datetime.now().year
        
        # 1. 尝试获取业绩快报 (更准确)
        try:
            df_exp = ak.stock_performance_report_sina(data=str(curr_year))
            if df_exp is not None and not df_exp.empty:
                matched = df_exp[df_exp['股票代码'] == symbol]
                if not matched.empty:
                    row = matched.iloc[0]
                    signals.append({
                        "type": "业绩快报 (Performance Express)",
                        "date": str(row.get('公告日期', '')),
                        "revenue": f"{row.get('营业收入', 0)}",
                        "revenue_yoy": f"{row.get('营业收入同比', 0)}%",
                        "net_income": f"{row.get('净利润', 0)}",
                        "net_income_yoy": f"{row.get('净利润同比', 0)}%"
                    })
        except Exception as e:
            print(f"Error fetching CN express for {symbol}: {e}")

        # 2. 尝试获取业绩预告 (更超前)
        try:
            df_forecast = ak.stock_yg_tj_sina(date=f"{curr_year}-12-31")
            # 如果没有年报预告，也可以查近期的，这里用简单的搜索
            if df_forecast is not None and not df_forecast.empty:
                matched = df_forecast[df_forecast['股票代码'] == symbol]
                if not matched.empty:
                    row = matched.iloc[0]
                    signals.append({
                        "type": "业绩预告 (Performance Forecast)",
                        "date": str(row.get('公告日期', '')),
                        "forecast_type": str(row.get('业绩预告类型', '')),
                        "summary": str(row.get('业绩预告摘要', '')),
                        "net_income_yoy_min": f"{row.get('净利润同比下限', '')}%",
                        "net_income_yoy_max": f"{row.get('净利润同比上限', '')}%"
                    })
        except Exception as e:
            print(f"Error fetching CN forecast for {symbol}: {e}")

        return {"signals": signals}

    def get_us_insights(self, symbol: str) -> Dict[str, Any]:
        """抓取美股最新机构评级与新闻"""
        signals = []
        try:
            ticker = yf.Ticker(symbol)
            # 1. 评级变动
            recs = ticker.recommendations
            if recs is not None and not recs.empty:
                # 选取最近的一条记录，通常按月份或近期给出
                latest_rec = recs.tail(1)
                signals.append({
                    "type": "机构评级 (Analyst Recommendations)",
                    "strong_buy": str(latest_rec['strongBuy'].values[0]) if 'strongBuy' in latest_rec else '0',
                    "buy": str(latest_rec['buy'].values[0]) if 'buy' in latest_rec else '0',
                    "hold": str(latest_rec['hold'].values[0]) if 'hold' in latest_rec else '0',
                    "sell": str(latest_rec['sell'].values[0]) if 'sell' in latest_rec else '0'
                })
            
            # 2. 近期新闻作为催化剂补充
            news = ticker.news
            if news:
                recent_news = news[:3]
                news_titles = [n.get('title', '') for n in recent_news]
                signals.append({
                    "type": "近期新闻催化 (Recent News)",
                    "headlines": news_titles
                })
        except Exception as e:
            print(f"Error fetching US insights for {symbol}: {e}")

        return {"signals": signals}

    def generate_insight_analysis(self, symbol: str, market: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """让 AI 扮演催化剂分析师"""
        if not self.api_key:
            raise Exception("DEEPSEEK_API_KEY not found.")

        signals = data.get("signals", [])
        if not signals:
            return {
                "impact_summary": "当前未监测到近期的短期催化剂（如业绩快报、预告或机构评级变动）。",
                "bull_case": ["暂无明确超预期信号"],
                "bear_case": ["暂无明确风险信号"],
                "sentiment_score": 50,
                "has_data": False
            }

        signals_json = json.dumps(signals, ensure_ascii=False, indent=2)
        
        prompt = f"""
        你是一位敏锐的华尔街“事件驱动型/催化剂 (Catalyst)”对冲基金分析师。
        当前正在分析股票 {symbol}（{market}市场）的最新前瞻性情报（非正式财报）。
        
        情报数据如下：
        {signals_json}
        
        请评估这些近期情报对该股短期基本面和情绪面的冲击。
        
        以 JSON 格式输出，必须包含且仅包含以下字段：
        - impact_summary: 情报整体解读（简短的一段中文，说明这些数据传递了什么核心信号）
        - bull_case: 基于情报的利好/超预期逻辑（中文数组，2-3条）
        - bear_case: 基于情报的潜在风险/隐忧逻辑（中文数组，2-3条）
        - sentiment_score: 情绪热度得分（0-100，整数。50为中性，越高越乐观）
        
        注意：仅返回 JSON 对象，不要带 ```json 标记。
        """

        client = OpenAI(api_key=self.api_key, base_url=self.api_base)
        response = client.chat.completions.create(
            model=self.model_name,
            messages=[
                {"role": "system", "content": "You are an expert event-driven analyst. Output valid JSON in Simplified Chinese."},
                {"role": "user", "content": prompt}
            ],
            stream=False,
            timeout=30.0
        )
        
        content = response.choices[0].message.content.strip()
        if "```json" in content: content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content: content = content.split("```")[1].split("```")[0].strip()
        
        start = content.find("{")
        end = content.rfind("}")
        
        result = json.loads(content[start:end+1])
        result["has_data"] = True
        result["raw_signals"] = signals
        return result
