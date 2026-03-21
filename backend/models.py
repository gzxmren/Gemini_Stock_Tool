import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from database import Base

class Watchlist(Base):
    __tablename__ = "watchlist"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)
    market = Column(String)  # 'US' or 'CN'

class Portfolio(Base):
    __tablename__ = "portfolio"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    market = Column(String)
    buy_price = Column(Float)
    quantity = Column(Integer)
    date = Column(String) # For simplicity, storing as string

class AIAnalysisCache(Base):
    __tablename__ = "ai_analysis_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    market = Column(String, index=True)
    target_dates = Column(String, index=True, default="latest")
    analysis_json = Column(Text) # 存储 LLM 返回的结构化字符串
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class StockFinancialsCache(Base):
    __tablename__ = "stock_financials_cache"
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    report_date = Column(String, index=True) # 锚点日期
    data_json = Column(Text) # 核心指标的 JSON 序列化存储
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class AIInsightsCache(Base):
    __tablename__ = "ai_insights_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    market = Column(String, index=True)
    insights_json = Column(Text) # 存储情报信号和 AI 分析的 JSON
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

