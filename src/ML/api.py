from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import json
import numpy as np
import tensorflow as tf
import yfinance as yf
from pydantic import BaseModel
from sklearn.preprocessing import MinMaxScaler
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List, Any, Union
from curl_cffi import requests as curl_requests
yf.shared._requests = curl_requests

# Configure logger
logger = logging.getLogger("uvicorn.error")

app = FastAPI()

# CORS configuration
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

# Ensure CORS headers on all responses
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

# Utility function to force dict keys to strings
JSONType = Union[dict, list, str, int, float, bool, None]

def ensure_str_keys(obj: Any) -> JSONType:
    if isinstance(obj, dict):
        return {str(k): ensure_str_keys(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [ensure_str_keys(v) for v in obj]
    else:
        return obj

# Load the trained model
model = tf.keras.models.load_model("lstm_model.h5")

# Mapping for crypto tickers
CRYPTO_MAPPING = {
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "ripple": "XRP-USD",
    "cardano": "ADA-USD",
    "dogecoin": "DOGE-USD"
}

# Request schemas
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
        # Fetch historical data
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return JSONResponse(status_code=404, content={"error": f"No data for {request.ticker}"})

        # Prepare data for LSTM
        df = df[["Open", "High", "Low", "Close"]].dropna()
        df["Date"] = df.index.strftime("%Y-%m-%d")
        close_prices = df["Close"].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices)

        # Ensure enough data
        seq_length = 60
        if scaled_data.shape[0] < seq_length:
            return JSONResponse(status_code=400, content={"error": "Not enough data"})

        # Generate predictions
        X_input = scaled_data[-seq_length:].reshape(1, seq_length, 1)
        future_preds = []
        for _ in range(request.days):
            nxt = model.predict(X_input, verbose=0)[0, 0]
            future_preds.append(float(nxt))
            X_input = np.append(
                X_input[:, 1:, :],
                np.array(nxt).reshape(1, 1, 1),
                axis=1
            )

        # Inverse scale
        predictions_list = scaler.inverse_transform(
            np.array(future_preds).reshape(-1, 1)
        ).flatten().tolist()

        # OHLC history
        ohlc_json = df.reset_index(drop=True)[["Date", "Open", "High", "Low", "Close"]] \
            .to_dict(orient="records")

        # Build response payload
        response_content = {
            "ticker": ticker,
            "predictions": predictions_list,
            "ohlc": ohlc_json
        }
        # Ensure all keys are strings
        safe = ensure_str_keys(response_content)
        # Return as valid JSON
        return JSONResponse(content=safe)

    except Exception as e:
        logger.exception("❌ Eroare la predict_stock")
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

# Compute volatility
def compute_volatility(prices: list) -> float:
    arr = np.asarray(prices).flatten()
    if arr.size < 2:
        return 0.0
    returns = np.diff(arr) / arr[:-1]
    return float(np.std(returns))

# Normalize sentiment [-1,1] -> [0,1]
def normalize_sentiment(sentiment):
    return (sentiment + 1) / 2

# Calculate risk score
def calculate_risk_score(average_sentiment, predicted_prices, recent_real_prices):
    sentiment_score = normalize_sentiment(average_sentiment)
    volatility_score = min(compute_volatility(recent_real_prices) * 100, 100) / 100
    model_confidence_score = 0.8
    risk_score = (
        (1 - sentiment_score) * 0.4 +
        volatility_score * 0.4 +
        (1 - model_confidence_score) * 0.2
    )
    return round(risk_score * 100, 2)

@app.post("/risk-score/")
def get_risk_score(request: RiskScoreRequest):
    logger.info(f"[RISK] request: {request}")
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return JSONResponse(status_code=404, content={"error": f"No data found for {ticker}"})

        close_prices = df['Close'].values
        recent_real = close_prices[-59:]
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled = scaler.fit_transform(close_prices.reshape(-1, 1))
        seq_length = 60
        if scaled.shape[0] < seq_length:
            return JSONResponse(status_code=400, content={"error": "Insufficient data for prediction."})

        X_input = scaled[-seq_length:].reshape(1, seq_length, 1)
        future_preds = []
        for _ in range(request.days):
            nxt = model.predict(X_input, verbose=0)[0, 0]
            future_preds.append(nxt)
            X_input = np.append(
                X_input[:, 1:, :],
                np.array(nxt).reshape(1, 1, 1),
                axis=1
            )
        
        predicted_list = scaler.inverse_transform(
            np.array(future_preds).reshape(-1, 1)
        ).flatten().tolist()

        score = calculate_risk_score(
            average_sentiment=request.average_sentiment,
            predicted_prices=predicted_list,
            recent_real_prices=recent_real
        )

        verdict = "Low Risk" if score < 33 else "Moderate Risk" if score < 66 else "High Risk"
        response = {"ticker": ticker, "risk_score": score, "verdict": verdict}
        return JSONResponse(content=response)

    except Exception as e:
        logger.exception("❌ Eroare la get_risk_score")
        return JSONResponse(status_code=500, content={"error": str(e)})
