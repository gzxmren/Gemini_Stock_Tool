from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse, PlainTextResponse
import os
import json
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from jinja2 import Environment, FileSystemLoader
import io

from database import get_db
import models
from repositories.analysis_repo import AnalysisRepository
from services.ai_service import AIService

# Try importing weasyprint, fallback if missing
try:
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except ImportError:
    HAS_WEASYPRINT = False

router = APIRouter()

# Setup Jinja2 environment
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(loader=FileSystemLoader(template_dir))

# Initialize services
ai_service = AIService()

@router.get("/analysis/dates")
async def get_analysis_dates(symbol: str, market: str, db: Session = Depends(get_db)):
    """
    Get available financial report dates for selection.
    """
    try:
        repo = AnalysisRepository(db)
        dates = ai_service.get_available_dates(symbol, market)
        cached_dates = repo.get_all_cached_dates(symbol, market)
        dates["cached_dates"] = cached_dates
        return dates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analysis/fundamentals")
async def get_ai_fundamentals_analysis(
    symbol: str, 
    market: str, 
    token: Optional[str] = None, 
    refresh: bool = False,
    check_only: bool = False,
    target_date: Optional[str] = None,
    compare_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Fetch financial data and perform AI-driven fundamental analysis.
    """
    repo = AnalysisRepository(db)
    symbol = symbol.upper()
    market = market.upper()
    
    # Normalize target dates for consistent caching
    cache_target_dates = "latest"
    if target_date and compare_date:
        d1, d2 = sorted([target_date, compare_date], reverse=True)
        target_date, compare_date = d1, d2
        cache_target_dates = f"{target_date}_vs_{compare_date}"
    elif target_date:
        cache_target_dates = target_date

    # 1. Check Database Cache
    if not refresh:
        cache_record = repo.get_cache(symbol, market, cache_target_dates)
        if cache_record:
            age = datetime.datetime.utcnow() - cache_record.created_at
            if age.days < 7:
                try:
                    cached_data = json.loads(cache_record.analysis_json)
                    # Inject dynamic info
                    if "_" in cache_record.target_dates:
                        cached_data["analysis_period"] = cache_record.target_dates.replace("_vs_", " vs ")
                    else:
                        cached_data["analysis_period"] = f"Snapshot as of {cache_record.target_dates}"
                    cached_data["cached_at"] = cache_record.created_at.strftime("%Y-%m-%d %H:%M")
                    return cached_data
                except json.JSONDecodeError:
                    pass

    if check_only:
        raise HTTPException(status_code=404, detail="No cache found for these parameters.")

    # 2. Fetch and Analyze
    try:
        dates, data = ai_service.fetch_financial_data(symbol, market, target_date, compare_date)
        
        try:
            analysis_json = ai_service.generate_analysis(symbol, market, dates, data, target_date, compare_date)
        except Exception as ai_err:
            return ai_service.get_fallback_analysis(str(ai_err))

        # 3. Save to Cache
        repo.save_cache(symbol, market, cache_target_dates, analysis_json)
        
        return analysis_json

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.get("/analysis/export")
async def export_analysis(
    symbol: str,
    market: str,
    format: str = "pdf",
    db: Session = Depends(get_db)
):
    """
    Export cached AI analysis report.
    """
    format = format.lower()
    if format not in ["pdf", "markdown", "md"]:
        raise HTTPException(status_code=400, detail="Unsupported format.")

    if format == "pdf" and not HAS_WEASYPRINT:
        raise HTTPException(status_code=501, detail="PDF generation not configured.")

    repo = AnalysisRepository(db)
    symbol = symbol.upper()
    market = market.upper()

    # Note: Export currently picks the first cache record it finds for the symbol
    # This matches original behavior but could be improved to specify target_dates
    cache_record = db.query(models.AIAnalysisCache).filter(
        models.AIAnalysisCache.symbol == symbol,
        models.AIAnalysisCache.market == market
    ).order_by(models.AIAnalysisCache.created_at.desc()).first()

    if not cache_record:
        raise HTTPException(status_code=404, detail="No cached analysis found.")

    try:
        analysis_data = json.loads(cache_record.analysis_json)
        template_vars = {
            "symbol": symbol,
            "market": market,
            "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
            "cached_at": cache_record.created_at.strftime("%Y-%m-%d %H:%M"),
            **analysis_data
        }

        if format in ["markdown", "md"]:
            template = jinja_env.get_template("analysis_report.md")
            md_content = template.render(template_vars)
            filename = f"{symbol}_AI_Report_{datetime.datetime.now().strftime('%Y%m%d')}.md"
            return PlainTextResponse(md_content, media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename={filename}"})

        elif format == "pdf":
            template = jinja_env.get_template("analysis_report.html")
            html_content = template.render(template_vars)
            pdf_file = io.BytesIO()
            HTML(string=html_content).write_pdf(pdf_file)
            pdf_file.seek(0)
            filename = f"{symbol}_AI_Report_{datetime.datetime.now().strftime('%Y%m%d')}.pdf"
            return StreamingResponse(pdf_file, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename={filename}"})

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")
