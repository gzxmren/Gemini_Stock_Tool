from sqlalchemy import Column, Integer, String, Float
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
