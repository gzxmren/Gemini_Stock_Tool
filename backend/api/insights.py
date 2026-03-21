from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import datetime
import json

from database import get_db
import models
from services.insights_service import InsightsService

router = APIRouter()
insights_service = InsightsService()

@router.get("/insights/latest")
async def get_latest_insights(symbol: str, market: str, refresh: bool = False, db: Session = Depends(get_db)):
    """
    获取短期情报和 AI 催化剂分析。
    """
    symbol = symbol.upper()
    market = market.upper()
    
    # 1. 检查缓存 (12小时有效期)
    if not refresh:
        cache_record = db.query(models.AIInsightsCache).filter(
            models.AIInsightsCache.symbol == symbol,
            models.AIInsightsCache.market == market
        ).first()
        
        if cache_record:
            age = datetime.datetime.utcnow() - cache_record.created_at
            # 12 小时过期
            if age.total_seconds() < 12 * 3600:
                try:
                    data = json.loads(cache_record.insights_json)
                    data["cached_at"] = cache_record.created_at.strftime("%Y-%m-%d %H:%M")
                    return data
                except json.JSONDecodeError:
                    pass

    # 2. 抓取新鲜情报
    if market == "CN":
        raw_data = insights_service.get_cn_insights(symbol)
    else:
        raw_data = insights_service.get_us_insights(symbol)
        
    # 3. AI 分析
    try:
        analysis_result = insights_service.generate_insight_analysis(symbol, market, raw_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI 解析失败: {str(e)}")

    # 4. 存入缓存
    cache_record = db.query(models.AIInsightsCache).filter(
        models.AIInsightsCache.symbol == symbol,
        models.AIInsightsCache.market == market
    ).first()
    
    if cache_record:
        cache_record.insights_json = json.dumps(analysis_result, ensure_ascii=False)
        cache_record.created_at = datetime.datetime.utcnow()
    else:
        new_cache = models.AIInsightsCache(
            symbol=symbol,
            market=market,
            insights_json=json.dumps(analysis_result, ensure_ascii=False),
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_cache)
    
    db.commit()
    
    analysis_result["cached_at"] = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    return analysis_result
