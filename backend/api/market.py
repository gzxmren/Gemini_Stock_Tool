from fastapi import APIRouter
import yfinance as yf
# import akshare as ak  # will be used later for A-shares

router = APIRouter()

@router.get("/quote")
def get_quote(symbol: str, market: str):
    if market.upper() == "US":
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.fast_info
            return {
                "symbol": symbol,
                "price": info.last_price
            }
        except Exception as e:
            return {"error": str(e)}
    return {"error": "Market not supported yet"}
