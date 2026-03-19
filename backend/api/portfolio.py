from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from pydantic import BaseModel

router = APIRouter()

class WatchlistItem(BaseModel):
    symbol: str
    market: str

@router.post("/watchlist")
def add_to_watchlist(item: WatchlistItem, db: Session = Depends(get_db)):
    db_item = db.query(models.Watchlist).filter(models.Watchlist.symbol == item.symbol).first()
    if db_item:
        return {"message": "Already in watchlist"}
    
    new_item = models.Watchlist(symbol=item.symbol, market=item.market)
    db.add(new_item)
    db.commit()
    return {"message": "Added to watchlist"}

@router.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    return db.query(models.Watchlist).all()

@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db)):
    db_item = db.query(models.Watchlist).filter(models.Watchlist.symbol == symbol).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "Removed from watchlist"}
