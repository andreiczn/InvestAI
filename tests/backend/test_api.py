import sys, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ML_PATH = os.path.join(ROOT, 'src', 'ML')
sys.path.insert(0, ML_PATH)

import tensorflow as tf
import numpy as np

class DummyModel:
    def predict(self, X, verbose=0):
        return np.array([[0.5]])


tf.keras.models.load_model = lambda path: DummyModel()


from fastapi.testclient import TestClient
from unittest.mock import patch
import pandas as pd
import pytest

from api import app  

client = TestClient(app)


def make_dummy_df(days: int = 65):
    dates = pd.date_range("2023-01-01", periods=days, freq="D")
    data = {
        "Open":  [100.0] * days,
        "High":  [105.0] * days,
        "Low":   [ 99.0] * days,
        "Close": [104.0] * days,
    }
    return pd.DataFrame(data, index=dates)


@patch("api.yf.download")
def test_predict_success(mock_download):
    df = make_dummy_df(days=61)
    mock_download.return_value = df

    resp = client.post("/predict/", json={"ticker": "AAPL", "days": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body["ticker"] == "AAPL"
    assert isinstance(body["predictions"], list) and len(body["predictions"]) == 5
    assert isinstance(body["ohlc"], list) and len(body["ohlc"]) >= 61


@patch("api.yf.download")
def test_predict_not_found(mock_download):
    mock_download.return_value = pd.DataFrame()
    resp = client.post("/predict/", json={"ticker": "NODATA", "days": 3})
    assert resp.status_code == 404


def test_analyze_sentiment_empty():
    resp = client.post("/analyze-sentiment/", json={"articles": []})
    assert resp.status_code == 200
    assert resp.json() == {"average_sentiment": 0.0, "individual_scores": []}


@patch("api.yf.download")
def test_risk_score_success(mock_download):
    df = make_dummy_df(days=65)
    mock_download.return_value = df

    payload = {"ticker": "AAPL", "average_sentiment": 0.1, "days": 3}
    resp = client.post("/risk-score/", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ticker"] == "AAPL"
    assert isinstance(body["risk_score"], float) and 0.0 <= body["risk_score"] <= 100.0
    assert body["verdict"] in {"Low Risk", "Moderate Risk", "High Risk"}


@patch("api.yf.download")
def test_risk_score_insufficient_data(mock_download):
    df = make_dummy_df(days=10)
    mock_download.return_value = df
    resp = client.post("/risk-score/", json={"ticker": "XYZ", "average_sentiment": 0.0, "days": 5})
    assert resp.status_code == 400
