from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import numpy as np
import tensorflow as tf
import yfinance as yf
from pydantic import BaseModel
from sklearn.preprocessing import MinMaxScaler
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Any, Union
from curl_cffi import requests as curl_requests

yf.shared._requests = curl_requests

logger = logging.getLogger("uvicorn.error")

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

JSONType = Union[dict, list, str, int, float, bool, None]

def ensure_str_keys(obj: Any) -> JSONType:
    if isinstance(obj, dict):
        return {str(k): ensure_str_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [ensure_str_keys(v) for v in obj]
    else:
        return obj

model = tf.keras.models.load_model("lstm_model.h5")

CRYPTO_MAPPING = {
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "ripple": "XRP-USD",
    "cardano": "ADA-USD",
    "dogecoin": "DOGE-USD"
}

class StockRequest(BaseModel):
    ticker: str
    days: int = 30

class NewsSentimentRequest(BaseModel):
    articles: List[str]

class RiskScoreRequest(BaseModel):
    ticker: str
    average_sentiment: float
    days: int = 30

@app.get("/")
def home():
    return {"message": "InvestAI API is running!"}

@app.post("/predict/")
def predict_stock(request: StockRequest):
    logger.info(f"[PREDICT] request: {request}")
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return JSONResponse(status_code=404, content={"error": f"No data for {request.ticker}"})
        df = df[["Open", "High", "Low", "Close"]].dropna()
        df["Date"] = df.index.strftime("%Y-%m-%d")
        close_prices = df["Close"].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices)
        seq_length = 60
        if scaled_data.shape[0] < seq_length:
            return JSONResponse(status_code=400, content={"error": "Not enough data"})
        X_input = scaled_data[-seq_length:].reshape(1, seq_length, 1)
        future_preds_norm = []
        for _ in range(request.days):
            nxt = model.predict(X_input, verbose=0)[0, 0]
            future_preds_norm.append(float(nxt))
            X_input = np.append(
                X_input[:, 1:, :],
                np.array(nxt).reshape(1, 1, 1),
                axis=1
            )
        future_preds_real = scaler.inverse_transform(
            np.array(future_preds_norm).reshape(-1, 1)
        ).flatten().tolist()
        ohlc_json = df.reset_index(drop=True)[["Date", "Open", "High", "Low", "Close"]].to_dict(orient="records")
        response_content = {
            "ticker": ticker,
            "predictions": future_preds_real,
            "ohlc": ohlc_json
        }
        safe = ensure_str_keys(response_content)
        return JSONResponse(content=safe)
    except Exception as e:
        logger.exception("❌ predict_stock error")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/analyze-sentiment/")
def analyze_sentiment(request: NewsSentimentRequest):
    try:
        analyzer = SentimentIntensityAnalyzer()
        sentiments = [analyzer.polarity_scores(a)["compound"] for a in request.articles]
        average_sentiment = float(np.mean(sentiments)) if sentiments else 0.0
        return {"average_sentiment": average_sentiment, "individual_scores": sentiments}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

def compute_volatility(prices: list) -> float:
    arr = np.asarray(prices).flatten()
    if arr.size < 2:
        return 0.0
    returns = np.diff(arr) / arr[:-1]
    return float(np.std(returns))

def compute_sentiment_risk(average_sentiment: float) -> float:
    return max(-average_sentiment, 0.0)

def compute_trend_risk(predictions: list, last_real: float) -> float:
    if len(predictions) == 0 or last_real == 0:
        return 0.0
    # finding the lowest point 
    p_min = float(min(predictions))
    drop_pct = (p_min - last_real) / last_real
    return min(abs(drop_pct), 1.0) if drop_pct < 0 else 0.0

def normalize_volatility(vol: float, vmax: float = 0.05) -> float:
    return min(vol / vmax, 1.0)

def calculate_risk_score(
    average_sentiment: float,
    predicted_prices: list,
    recent_real_prices: list
) -> float:
    
    s_s = compute_sentiment_risk(average_sentiment)
    
    v = compute_volatility(recent_real_prices)
    s_v = normalize_volatility(v)
    
    if recent_real_prices is not None and len(recent_real_prices) > 0:
        last_real = float(recent_real_prices[-1])
    else:
        last_real = 0.0
    
    s_t = compute_trend_risk(predicted_prices, last_real)

    
    raw = 1.0 - (1.0 - s_s) * (1.0 - s_t) * (1.0 - s_v)
    
    return round(float(raw) * 100.0, 2)

@app.post("/risk-score/")
def get_risk_score(request: RiskScoreRequest):
    logger.info(f"[RISK] request: {request}")
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return JSONResponse(status_code=404, content={"error": f"No data found for {ticker}"})
        close_prices = df["Close"].values
       
        recent_real = close_prices[-59:]
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = scaler.fit_transform(close_prices.reshape(-1, 1))
        seq_length = 60
        if scaled.shape[0] < seq_length:
            return JSONResponse(status_code=400, content={"error": "Insufficient data for prediction."})
        X_input = scaled[-seq_length:].reshape(1, seq_length, 1)
        future_preds_norm = []
        for _ in range(request.days):
            nxt = model.predict(X_input, verbose=0)[0, 0]
            future_preds_norm.append(float(nxt))
            X_input = np.append(
                X_input[:, 1:, :],
                np.array(nxt).reshape(1, 1, 1),
                axis=1
            )
        predicted_list = scaler.inverse_transform(
            np.array(future_preds_norm).reshape(-1, 1)
        ).flatten().tolist()

        score = calculate_risk_score(
            average_sentiment=request.average_sentiment,
            predicted_prices=predicted_list,
            recent_real_prices=recent_real
        )

        if score < 33:
            verdict = "Low Risk"
        elif score < 66:
            verdict = "Moderate Risk"
        else:
            verdict = "High Risk"

        response = {"ticker": ticker, "risk_score": score, "verdict": verdict}
        return JSONResponse(content=response)
    except Exception as e:
        logger.exception("❌ get_risk_score error")
        return JSONResponse(status_code=500, content={"error": str(e)})
