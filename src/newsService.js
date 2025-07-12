
const MARKETAUX_API_KEY = import.meta.env.VITE_MARKETAUX_KEY;
const BASE_URL = "https://api.marketaux.com/v1/news/all"; // base news endpoint


export const getStockNews = async (symbol = "AAPL") => {
  try {
    const response = await fetch(`${BASE_URL}?api_token=${MARKETAUX_API_KEY}&symbols=${symbol}&filter_entities=true&language=en`);  // fetch stock news
    const data = await response.json();
    return data.data; 
  } catch (error) {
    console.error("Error fetching stock news:", error);
    return []; // fallback empty
  }
};
export const getCryptoNews = async () => {
  try {
    const response = await fetch(
      `${BASE_URL}?api_token=${MARKETAUX_API_KEY}&filter_entities=true&language=en&q=crypto`
    ); // fetch crypto news
    const data = await response.json();
    console.log("Crypto news API response:", data);  // log response
    return data.data ?? []; 
  } catch (error) {
    console.error("Error fetching crypto news:", error);
    return [];
  }
};
export const analyzeNewsSentiment = async (articles) => {
  try {
    const texts = articles
      .map(article => article.description || article.title || "") // extract text
      .filter(text => text.length > 10); // filter short

    const response = await fetch("http://localhost:8000/analyze-sentiment/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ articles: texts }) // send texts
    });

    const data = await response.json();
    return data;  // return sentiment
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
        average_sentiment: parseFloat(averageSentiment),  // send data
        days: days
      })
    });

    const data = await response.json();
    return data;  // return risk
  } catch (error) {
    console.error("Error fetching risk score:", error);
    return null;  // fallback
  }
};

