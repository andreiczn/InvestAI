import numpy as np
import pytest

from api import (
    compute_volatility,
    compute_sentiment_risk,
    compute_trend_risk,
    normalize_volatility,
    calculate_risk_score
)

def test_compute_volatility_empty_or_single():
    assert compute_volatility([]) == 0.0
    assert compute_volatility([100.0]) == 0.0

def test_compute_volatility_basic():
    prices = [100.0, 110.0, 105.0]
    vol = compute_volatility(prices)
    expected = np.std(np.diff(prices) / prices[:-1])
    assert vol == pytest.approx(expected, rel=1e-2)

def test_compute_sentiment_risk():
    assert compute_sentiment_risk(0.5) == 0.0    
    assert compute_sentiment_risk(-0.3) == 0.3   

def test_compute_trend_risk_no_drop_or_empty():
    assert compute_trend_risk([], 100.0) == 0.0
    assert compute_trend_risk([110.0, 120.0], 100.0) == 0.0

def test_compute_trend_risk_drop():
    assert compute_trend_risk([95.0, 90.0], 100.0) == pytest.approx(0.1, rel=1e-6)

def test_normalize_volatility():
    assert normalize_volatility(0.02, vmax=0.05) == pytest.approx(0.4)
    assert normalize_volatility(0.1, vmax=0.05) == 1.0

def test_calculate_risk_score_combination():
    avg_sentiment = -0.5
    predicted = [90.0, 92.0]
    recent = [100.0, 105.0, 110.0]
    score = calculate_risk_score(avg_sentiment, predicted, recent)
    assert score == pytest.approx(60.01, rel=1e-2)
