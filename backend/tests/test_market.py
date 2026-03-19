from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_stock_quote():
    # Test with Apple (US)
    response = client.get("/api/quote?symbol=AAPL&market=US")
    assert response.status_code == 200
    data = response.json()
    assert "price" in data
    assert "symbol" in data
    assert data["symbol"] == "AAPL"
