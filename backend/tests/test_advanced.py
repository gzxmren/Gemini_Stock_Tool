from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_historical_valuation():
    response = client.get("/api/history?symbol=AAPL&market=US")
    assert response.status_code == 200
    data = response.json()
    assert "historical_pe" in data
    assert len(data["historical_pe"]) > 0

def test_analyst_consensus():
    response = client.get("/api/quote?symbol=AAPL&market=US")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "analyst_target" in data["metrics"]
    assert "low" in data["metrics"]["analyst_target"]

def test_dcf_calculation():
    response = client.post("/api/dcf", json={
        "fcf": 10, "shares": 10, "growth_rate": 0.10, "discount_rate": 0.10, "terminal_rate": 0.02, "years": 5
    })
    assert response.status_code == 200
    assert "intrinsic_value" in response.json()

def test_professional_dcf_data():
    response = client.get("/api/dcf/professional?symbol=AAPL")
    assert response.status_code == 200
    data = response.json()
    assert "income_statement" in data
    assert "cash_flow" in data
    assert "balance_sheet" in data
    assert "wacc_params" in data
