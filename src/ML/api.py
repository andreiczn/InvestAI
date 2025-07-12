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
import time

# use curl-based requests in yfinance for faster downloads
yf.shared._requests = curl_requests  

# set up logger to capture errors and info
logger = logging.getLogger("uvicorn.error")  

# initialize FastAPI app instance
app = FastAPI()  

# define allowed origins for CORS (frontend URLs)
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
     # inject CORS headers on every response
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response
# helper to convert all dict keys to strings for JSON safety
JSONType = Union[dict, list, str, int, float, bool, None]

def ensure_str_keys(obj: Any) -> JSONType:
    if isinstance(obj, dict):
        return {str(k): ensure_str_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [ensure_str_keys(v) for v in obj]
    else:
        return obj
# load pre-trained LSTM model for price predictions
model = tf.keras.models.load_model("lstm_model.h5")
# map user-friendly names to market tickers for crypto
CRYPTO_MAPPING = {
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "ripple": "XRP-USD",
    "cardano": "ADA-USD",
    "dogecoin": "DOGE-USD"
}

# define request schemas using Pydantic
class StockRequest(BaseModel):
    ticker: str  # ticker symbol or crypto name
    days: int = 30  # number of days to predict

class NewsSentimentRequest(BaseModel):
    articles: List[str]  # list of article texts to analyze

class RiskScoreRequest(BaseModel):
    ticker: str  # symbol or name for risk analysis
    average_sentiment: float  # precomputed average sentiment
    days: int = 30  # forecast horizon for risk


@app.get("/")
def home():
    # simple health check endpoint
    return {"message": "InvestAI API is running!"}

@app.post("/predict/")
def predict_stock(request: StockRequest):
    # predict future prices based on LSTM model
    logger.info(f"[PREDICT] request: {request}")
    try:
        # resolve ticker name or use direct
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        # download historical OHLC data
        df = yf.download(ticker, period="3y", interval="1d", auto_adjust=False)
        if df.empty:
            # return 404 if no data
            return JSONResponse(status_code=404, content={"error": f"No data for {request.ticker}"})
        # keep only necessary columns and drop nulls
        df = df[["Open", "High", "Low", "Close"]].dropna()
        df["Date"] = df.index.strftime("%Y-%m-%d")
        # scale closing prices for model input
        close_prices = df["Close"].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices)
        seq_length = 60
        if len(scaled_data) < seq_length:
            return JSONResponse(status_code=400, content={"error": "Not enough data"})
        # prepare sequence for prediction
        X_input = scaled_data[-seq_length:].reshape(1, seq_length, 1)
        future_preds_norm = []
        # roll the model to predict each next day
        for _ in range(request.days):
            nxt = model.predict(X_input, verbose=0)[0, 0]
            future_preds_norm.append(float(nxt))
            # append new prediction and drop oldest
            X_input = np.append(X_input[:, 1:, :], [[ [nxt] ]], axis=1)
        # transform normalized preds back to real prices
        future_preds_real = scaler.inverse_transform(
            np.array(future_preds_norm).reshape(-1, 1)
        ).flatten().tolist()
        # prepare OHLC history for frontend chart
        ohlc_json = df.reset_index(drop=True)[["Date", "Open", "High", "Low", "Close"]].to_dict(orient="records")
        response_content = {
            "ticker": ticker,
            "predictions": future_preds_real,
            "ohlc": ohlc_json
        }
        # ensure JSON keys are strings
        return JSONResponse(content=ensure_str_keys(response_content))
    except Exception as e:
        logger.exception("predict_stock error")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/analyze-sentiment/")
def analyze_sentiment(request: NewsSentimentRequest):
    # compute compound sentiment score for list of texts
    try:
        analyzer = SentimentIntensityAnalyzer()
        scores = [analyzer.polarity_scores(text)["compound"] for text in request.articles]
        avg_score = float(np.mean(scores)) if scores else 0.0
        return {"average_sentiment": avg_score, "individual_scores": scores}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# helper: compute daily returns volatility
def compute_volatility(prices: list) -> float:
    arr = np.asarray(prices)
    if arr.size < 2:
        return 0.0
    returns = np.diff(arr) / arr[:-1]
    return float(np.std(returns))

# helper: sentiment risk is negative tone only
def compute_sentiment_risk(avg_sent: float) -> float:
    return max(-avg_sent, 0.0)

# helper: trend risk based on worst dip
def compute_trend_risk(preds: list, last_real: float) -> float:
    if not preds or last_real == 0.0:
        return 0.0
    p_min = float(min(preds))
    drop = (p_min - last_real) / last_real
    return min(abs(drop), 1.0) if drop < 0 else 0.0

# normalize volatility relative to vmax threshold
def normalize_volatility(vol: float, vmax: float = 0.05) -> float:
    return min(vol / vmax, 1.0)

# combine risk components into final score
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
    # calculate risk given sentiment and predicted trends
    logger.info(f"[RISK] request: {request}")
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return JSONResponse(status_code=404, content={"error": f"No data found for {ticker}"})
        close_prices = df["Close"].values
         # get recent real prices and model preds
        recent_real = close_prices[-59:]
        # generate normalized predictions same as /predict/
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
        # compute composite risk score
        score = calculate_risk_score(
            average_sentiment=request.average_sentiment,
            predicted_prices=predicted_list,
            recent_real_prices=recent_real
        )
        # derive verdict category    
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
