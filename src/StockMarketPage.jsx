import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";
import { getStockNews, analyzeNewsSentiment } from "./newsService"; 
import { getRiskScore } from "./newsService";



ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

import logo from "./assets/investAI.png";
import "./styling/StockMarketPage.css";

const StockMarketPage = () => {
  const [stockSymbol, setStockSymbol] = useState("AAPL");
  const [stockData, setStockData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState("");
  const [chartKey, setChartKey] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false); // Control vizibilitate grafic predicție
  const [stockNews, setStockNews] = useState([]);
  const [riskData, setRiskData] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);



  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);
  useEffect(() => {
    const fetchSentimentAndRisk = async () => {
      setLoadingRisk(true);
      const news = await getStockNews(stockSymbol);
      const sentiment = await analyzeNewsSentiment(news);
  
      console.log("Sentiment analysis result:", sentiment);
  
      const risk = await getRiskScore(stockSymbol, sentiment.average_sentiment, 30);
      console.log("Risk Score Result:", risk);
  
      setRiskData(risk);
      setLoadingRisk(false);
    };
  
    fetchSentimentAndRisk();
  }, [stockSymbol]);
  

  const fetchStockData = async (symbol) => {
    setLoading(true);
    setErrorMessage("");

    try {
      console.log("Fetching stock data for:", symbol);
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=PCWGE28SU6R1UMOT`
      );
      

      if (response.data["Note"]) {
        setErrorMessage("API limit reached. Try again tomorrow or use a different API key.");
        setLoading(false);
        return;
      }

      const data = response.data["Time Series (Daily)"];
      if (!data) {
        setErrorMessage("No stock data available.");
        setLoading(false);
        return;
      }

      const formattedData = Object.entries(data)
        .slice(0, 60)
        .map(([date, values]) => ({
          x: new Date(date),
          o: parseFloat(values["1. open"]),
          h: parseFloat(values["2. high"]),
          l: parseFloat(values["3. low"]),
          c: parseFloat(values["4. close"]),
        }));

      setStockData(formattedData.reverse());
      setChartKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error("Error fetching stock data:", error);
      setErrorMessage("Failed to fetch stock data. Please try again later.");
    }

    setLoading(false);
  };

  const fetchPrediction = async () => {
    setLoadingPrediction(true);
    setShowPrediction(false); 

    try {
      const response = await fetch("http://127.0.0.1:8000/predict/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: stockSymbol }),
      });

      if (!response.ok) {
        throw new Error("Eroare la obținerea predicției");
      }

      const data = await response.json();
      setPrediction(data.predictions);
      setShowPrediction(true); 
    } catch (error) {
      console.error("Eroare:", error);
      setPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  useEffect(() => {
    fetchStockData(stockSymbol);
    getStockNews(stockSymbol).then(setStockNews);
  }, [stockSymbol]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",
        time: {
          unit: "day",
          tooltipFormat: "yyyy-MM-dd",
        },
        ticks: {
          source: "auto",
        },
      },
      y: {
        beginAtZero: false,
      },
    },
  };


  const predictionChartData = prediction
    ? {
        labels: Array.from({ length: prediction.length }, (_, i) => {
          const today = new Date();
          today.setDate(today.getDate() + i + 1);
          return today;
        }),
        datasets: [
          {
            label: `${stockSymbol} AI Prediction`,
            data: prediction,
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            pointRadius: 2,
            fill: true,
          },
        ],
      }
    : null;

  return (
    <div className="stocks-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={logo} alt="InvestAI Logo" />
        </div>
        <div className="navbar-center">
          <span>Hello, {userEmail}</span>
        </div>
        <div className="navbar-links">
          <Link to="/" className={location.pathname === "/" ? "active" : ""}>
            Home
          </Link>
          <Link to="/stocks" className={location.pathname === "/stocks" ? "active" : ""}>
            Stocks
          </Link>
          <Link to="/crypto" className={location.pathname === "/crypto" ? "active" : ""}>
            Crypto
          </Link>
        </div>
      </nav>

      {/* Selecție Stock */}
      <div className="stock-selector">
        <label>Select a Stock:</label>
        <select value={stockSymbol} onChange={(e) => setStockSymbol(e.target.value)}>
          <option value="AAPL">Apple (AAPL)</option>
          <option value="GOOGL">Google (GOOGL)</option>
          <option value="MSFT">Microsoft (MSFT)</option>
          <option value="TSLA">Tesla (TSLA)</option>
          <option value="AMZN">Amazon (AMZN)</option>
        </select>
      </div>

      <button className="predict-button" onClick={fetchPrediction} disabled={loadingPrediction}>
        {loadingPrediction ? "Processing..." : "Predict Evolution with AI"}
      </button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {/* Grafic Candlestick pentru date istorice */}
      <div className="chart-container">
        {loading ? (
          <p>Loading...</p>
        ) : (
          <Chart
            key={chartKey}
            redraw
            type="candlestick"
            data={{
              datasets: [
                {
                  label: `${stockSymbol} Stock Price`,
                  data: stockData,
                  borderColor: "black",
                  backgroundColor: "rgba(0, 255, 0, 0.5)",
                  barThickness: 10,
                },
              ],
            }}
            options={chartOptions}
          />
        )}
      </div>

      {/* Afișare grafic doar după generarea predicției */}
      {showPrediction && predictionChartData && (
        <div className="chart-container">
          <Chart type="line" data={predictionChartData} options={chartOptions} />
        </div>
      )}
      {loadingRisk ? (
      <p style={{ color: "white", textAlign: "center" }}>🔄 Analyzing risk...</p>
        ) : riskData ? (
          <div style={{
            backgroundColor: "#1a1a2e",
            padding: "1.5rem",
            borderRadius: "1rem",
            marginTop: "2rem",
            border: "2px solid #00bfff",
            textAlign: "center",
            color: "white"
          }}>
            <h3 style={{ marginBottom: "0.5rem" }}>📊 AI Risk Verdict</h3>
            <p><strong>Risk Score:</strong> {riskData.risk_score}/100</p>
            <p>
              <strong>Verdict:</strong>{" "}
              <span style={{
                color:
                  riskData.verdict === "Low Risk"
                    ? "limegreen"
                    : riskData.verdict === "Moderate Risk"
                    ? "orange"
                    : "red"
              }}>
                {riskData.verdict}
              </span>
            </p>
          </div>
        ) : null}

      {/* Secțiune știri */}
      <div className="news-container">
        <h2>Latest News for {stockSymbol}</h2>
        {stockNews.length === 0 ? (
          <p>No news available.</p>
        ) : (
          <ul className="news-list">
            {stockNews.map((article) => (
              <li key={article.uuid} className="news-item">
                <a href={article.url} target="_blank" rel="noreferrer">
                  <strong>{article.title}</strong>
                </a>
                <p className="news-meta">
                  {article.source} – {new Date(article.published_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
};

export default StockMarketPage;