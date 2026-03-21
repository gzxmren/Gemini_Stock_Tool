from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_analyst_consensus():
    response = client.get("/api/analyst/targets?symbol=AAPL&market=US")
    assert response.status_code == 200
    data = response.json()
    assert "mean" in data
    assert "high" in data
    assert "low" in data

def test_dcf_baseline():
    response = client.get("/api/dcf/baseline?symbol=AAPL&market=US")
    assert response.status_code == 200
    data = response.json()
    assert "fcf" in data
    assert "shares" in data

def test_dcf_calculation():
    response = client.post("/api/dcf", json={
        "fcf": 10, "shares": 10, "growth_rate": 0.1, "discount_rate": 0.1, "terminal_rate": 0.02, "years": 5
    })
    assert response.status_code == 200
    data = response.json()
    assert "fair_value" in data

def test_professional_dcf_data():
    response = client.get("/api/dcf/professional?symbol=AAPL")
    assert response.status_code == 200
    data = response.json()
    assert "symbol" in data
    assert "income_statement" in data
    assert "revenue" in data["income_statement"]
    assert "ebit" in data["income_statement"]
    assert "cash_flow" in data
    assert "capex" in data["cash_flow"]
    assert "wacc_params" in data
