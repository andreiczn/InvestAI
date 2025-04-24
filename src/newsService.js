
const MARKETAUX_API_KEY = "pdxbTPZhJkghV1w4UoupKwVYYd0xoW9I9rlj42PG";
const BASE_URL = "https://api.marketaux.com/v1/news/all";

export const getStockNews = async (symbol = "AAPL") => {
  try {
    const response = await fetch(`${BASE_URL}?api_token=${MARKETAUX_API_KEY}&symbols=${symbol}&filter_entities=true&language=en`);
    const data = await response.json();
    return data.data; // lista de articole
  } catch (error) {
    console.error("Error fetching stock news:", error);
    return [];
  }
};
export const getCryptoNews = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}?api_token=${MARKETAUX_API_KEY}&filter_entities=true&language=en&q=crypto`
    );
    const data = await response.json();
    console.log("Crypto news API response:", data); // ✅ debug in consola
    return data.data ?? []; // ✅ fallback in caz ca lipseste
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
};
export const analyzeNewsSentiment = async (articles) => {
  try {
    const texts = articles
      .map(article => article.description || article.title || "") // sau .content dacă există
      .filter(text => text.length > 10); // evităm texte goale

    const response = await fetch("http://localhost:8000/analyze-sentiment/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ articles: texts })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    return { average_sentiment: 0, individual_scores: [] };
  }
};
export const getRiskScore = async (ticker, averageSentiment, days = 30) => {
  try {
    const response = await fetch("http://localhost:8000/risk-score/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ticker: ticker,
        average_sentiment: parseFloat(averageSentiment),
        days: days
      })
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching risk score:", error);
    return null;
  }
};

