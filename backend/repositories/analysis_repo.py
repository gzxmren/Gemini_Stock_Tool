from sqlalchemy.orm import Session
import models
import datetime
import json
from typing import Optional

class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_cache(self, symbol: str, market: str, target_dates: str) -> Optional[models.AIAnalysisCache]:
        """
        Fetch a cached analysis record from the database.
        """
        return self.db.query(models.AIAnalysisCache).filter(
            models.AIAnalysisCache.symbol == symbol.upper(),
            models.AIAnalysisCache.market == market.upper(),
            models.AIAnalysisCache.target_dates == target_dates
        ).first()

    def get_all_cached_dates(self, symbol: str, market: str) -> list[str]:
        """
        Get all dates that have a cached analysis.
        """
        records = self.db.query(models.AIAnalysisCache.target_dates).filter(
            models.AIAnalysisCache.symbol == symbol.upper(),
            models.AIAnalysisCache.market == market.upper()
        ).all()
        
        dates = []
        for r in records:
            # Handle "latest" and combined dates
            if "_" in r.target_dates:
                # For comparisons, maybe we don't want to show them as pills?
                # Or just show the main date. For now let's just show single dates.
                continue
            if r.target_dates == "latest":
                continue
            dates.append(r.target_dates)
        
        return sorted(list(set(dates)), reverse=True)

    def save_cache(self, symbol: str, market: str, target_dates: str, analysis_json: dict) -> models.AIAnalysisCache:
        """
        Save or update an analysis record in the database.
        """
        symbol = symbol.upper()
        market = market.upper()
        
        db_record = self.get_cache(symbol, market, target_dates)
        
        analysis_str = json.dumps(analysis_json, ensure_ascii=False)
        
        if db_record:
            db_record.analysis_json = analysis_str
            db_record.created_at = datetime.datetime.utcnow()
        else:
            db_record = models.AIAnalysisCache(
                symbol=symbol,
                market=market,
                target_dates=target_dates,
                analysis_json=analysis_str,
                created_at=datetime.datetime.utcnow()
            )
            self.db.add(db_record)
        
        self.db.commit()
        self.db.refresh(db_record)
        return db_record

    def clear_expired_cache(self, days: int = 7):
        """
        Remove cache records older than the specified number of days.
        """
        expiration_date = datetime.datetime.utcnow() - datetime.timedelta(days=days)
        self.db.query(models.AIAnalysisCache).filter(
            models.AIAnalysisCache.created_at < expiration_date
        ).delete()
        self.db.commit()
