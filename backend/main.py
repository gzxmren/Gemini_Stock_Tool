from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import market

app = FastAPI(title="Stock Screener API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok"}
