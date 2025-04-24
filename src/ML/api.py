from fastapi import FastAPI
import numpy as np
import tensorflow as tf
import yfinance as yf
from pydantic import BaseModel
from sklearn.preprocessing import MinMaxScaler
from fastapi.middleware.cors import CORSMiddleware
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from typing import List


app = FastAPI()

# CORS pentru acces din frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Încărcăm modelul antrenat
model = tf.keras.models.load_model("lstm_model.h5")

# Mapare nume crypto -> ticker Yahoo Finance
CRYPTO_MAPPING = {
    "bitcoin": "BTC-USD",
    "ethereum": "ETH-USD",
    "ripple": "XRP-USD",
    "cardano": "ADA-USD",
    "dogecoin": "DOGE-USD"
}

# Structura requestului primit de la frontend
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
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())

        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return {"error": f"No data found for {request.ticker}"}

        df = df[["Open", "High", "Low", "Close"]].copy()
        df["Date"] = df.index.strftime("%Y-%m-%d")
        close_prices = df["Close"].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices)

        seq_length = 60
        if len(scaled_data) < seq_length:
            return {"error": "Insufficient data for prediction."}

        X_input = scaled_data[-seq_length:].reshape(1, seq_length, 1)
        future_predictions = []
        for _ in range(request.days):
            next_pred = model.predict(X_input, verbose=0)[0, 0]
            future_predictions.append(next_pred)
            X_input = np.append(X_input[:, 1:, :], np.array(next_pred).reshape(1, 1, 1), axis=1)

        future_predictions = scaler.inverse_transform(np.array(future_predictions).reshape(-1, 1)).flatten().tolist()

        ohlc_json = df.reset_index(drop=True)[["Date", "Open", "High", "Low", "Close"]].to_dict(orient="records")

        return {
            "ticker": ticker,
            "predictions": future_predictions,
            "ohlc": ohlc_json
        }

    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze-sentiment/")
def analyze_sentiment(request: NewsSentimentRequest):
    try:
        analyzer = SentimentIntensityAnalyzer()
        sentiments = []

        for article in request.articles:
            score = analyzer.polarity_scores(article)
            sentiments.append(score['compound'])  # scor între -1 (negativ) și +1 (pozitiv)

        average_sentiment = np.mean(sentiments) if sentiments else 0.0

        return {
            "average_sentiment": average_sentiment,
            "individual_scores": sentiments
        }

    except Exception as e:
        return {"error": str(e)}


def compute_volatility(prices):
    returns = np.diff(prices) / prices[:-1]
    return np.std(returns)

def normalize_sentiment(sentiment):
    return (sentiment + 1) / 2


def calculate_risk_score(average_sentiment, predicted_prices, recent_real_prices):
    sentiment_score = normalize_sentiment(average_sentiment)  # [0,1]
    volatility = compute_volatility(np.array(recent_real_prices))  # deviația standard
    volatility_score = min(volatility * 100, 100) / 100  # scalează la [0,1]

    # Opțional: scor de încredere din model AI (dacă e disponibil)
    model_confidence_score = 0.8  # hardcoded momentan

    # Calcul scor total
    risk_score = (
        (1 - sentiment_score) * 0.4 +  # sentiment negativ => risc mai mare
        volatility_score * 0.4 +
        (1 - model_confidence_score) * 0.2
    )

    # Scale to 0–100 pentru UX
    return round(risk_score * 100, 2)

@app.post("/risk-score/")
def get_risk_score(request: RiskScoreRequest):
    try:
        ticker = CRYPTO_MAPPING.get(request.ticker.lower(), request.ticker.upper())

        # Preluăm datele de piață
        df = yf.download(ticker, period="3y", interval="1d")
        if df.empty:
            return {"error": f"No data found for {ticker}"}

        df = df[['Close']]
        close_prices = df["Close"].values

        # Preluăm ultimele 60 de valori reale
        recent_real_prices = close_prices[-60:]

        # Pregătim datele pentru predicții
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(close_prices.reshape(-1, 1))
        seq_length = 60

        if len(scaled_data) < seq_length:
            return {"error": "Insufficient data for prediction."}

        X_input = scaled_data[-seq_length:].reshape(1, seq_length, 1)

        future_predictions = []
        for _ in range(request.days):
            next_pred = model.predict(X_input, verbose=0)[0, 0]
            future_predictions.append(next_pred)
            X_input = np.append(X_input[:, 1:, :], np.array(next_pred).reshape(1, 1, 1), axis=1)

        predicted_prices = scaler.inverse_transform(np.array(future_predictions).reshape(-1, 1)).flatten()

        # Calculăm scorul de risc
        score = calculate_risk_score(
            average_sentiment=request.average_sentiment,
            predicted_prices=predicted_prices,
            recent_real_prices=recent_real_prices
        )

        # Clasificare textuală
        if score < 33:
            verdict = "Low Risk"
        elif score < 66:
            verdict = "Moderate Risk"
        else:
            verdict = "High Risk"

        return {
            "ticker": ticker,
            "risk_score": score,
            "verdict": verdict
        }

    except Exception as e:
        return {"error": str(e)}