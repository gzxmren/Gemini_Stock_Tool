from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import market, portfolio
import models
from database import engine

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Stock Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api")
app.include_router(portfolio.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}
