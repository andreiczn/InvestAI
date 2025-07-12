import sys, os
# added ML module path so api can load model from src/ML folder\ nROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ML_PATH = os.path.join(ROOT, 'src', 'ML')
sys.path.insert(0, ML_PATH)

import tensorflow as tf  # tensorflow for model loading
import numpy as np  # numerical arrays

# create dummy model for tests to avoid loading real LSTM
class DummyModel:
    def predict(self, X, verbose=0):
        return np.array([[0.5]])

# monkey-patch load_model to return dummy
tf.keras.models.load_model = lambda path: DummyModel()

from fastapi.testclient import TestClient  # test client for FastAPI
from unittest.mock import patch  # patch external calls
import pandas as pd  # dataframe utils
import pytest  # testing framework

from api import app  # import FastAPI app

client = TestClient(app)  # instantiate test client


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
    df = make_dummy_df(days=61)  # minimal days for seq
    mock_download.return_value = df

    resp = client.post("/predict/", json={"ticker": "AAPL", "days": 5})
    assert resp.status_code == 200  # expect OK
    body = resp.json()
    assert body["ticker"] == "AAPL"  # correct ticker
    assert isinstance(body["predictions"], list) and len(body["predictions"]) == 5  # correct length
    assert isinstance(body["ohlc"], list) and len(body["ohlc"]) >= 61  # ohlc history


@patch("api.yf.download")
def test_predict_not_found(mock_download):
    mock_download.return_value = pd.DataFrame()  # empty df
    resp = client.post("/predict/", json={"ticker": "NODATA", "days": 3})
    assert resp.status_code == 404  # not found



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
    df = make_dummy_df(days=10)  # insufficient for 60-day seq
    mock_download.return_value = df
    resp = client.post("/risk-score/", json={"ticker": "XYZ", "average_sentiment": 0.0, "days": 5})
    assert resp.status_code == 400  # bad request for insufficient data
