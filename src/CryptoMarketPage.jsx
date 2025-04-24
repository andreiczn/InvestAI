import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import "chartjs-adapter-date-fns";
import { CandlestickController, CandlestickElement } from "chartjs-chart-financial";
import { getCryptoNews } from "./newsService";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
);

import logo from "./assets/investAI.png";
import "./styling/CryptoMarketPage.css";

const CryptoMarketPage = () => {
  const [cryptoSymbol, setCryptoSymbol] = useState("bitcoin");
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState("");
  const [chartKey, setChartKey] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [cryptoNews, setCryptoNews] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  const fetchCryptoData = async (symbol) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=90&interval=daily&x_cg_demo_api_key=CG-oYY9gdkcX6pr94DMeqcXzKmv`
      );

      const prices = response.data.prices;
      if (!prices || prices.length === 0) {
        setErrorMessage("No crypto data available.");
        setLoading(false);
        return;
      }

      const formattedData = prices.map(([timestamp, price], index, arr) => {
        const open = index === 0 ? price : arr[index - 1][1];
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low = Math.min(open, close) * (1 - Math.random() * 0.02);

        return {
          x: new Date(timestamp),
          o: open,
          h: high,
          l: low,
          c: close,
        };
      });

      setCryptoData(formattedData);
      setChartKey((prevKey) => prevKey + 1);
    } catch (error) {
      console.error("Error fetching crypto data:", error);
      setErrorMessage("Failed to fetch crypto data. Please try again later.");
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
        body: JSON.stringify({ ticker: cryptoSymbol }),
      });

      if (!response.ok) throw new Error("Eroare la predicție");

      const data = await response.json();
      setPrediction(data.predictions);
      setShowPrediction(true);
    } catch (error) {
      console.error("Predict error:", error);
      setPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  useEffect(() => {
    fetchCryptoData(cryptoSymbol);
    getCryptoNews().then(setCryptoNews); // ✅ adăugat pentru știri
  }, [cryptoSymbol]);

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
            label: `${cryptoSymbol.toUpperCase()} AI Prediction`,
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
    <div className="crypto-container">
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

      <div className="crypto-selector">
        <label>Select a Cryptocurrency:</label>
        <select value={cryptoSymbol} onChange={(e) => setCryptoSymbol(e.target.value)}>
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="ripple">Ripple (XRP)</option>
          <option value="cardano">Cardano (ADA)</option>
          <option value="dogecoin">Dogecoin (DOGE)</option>
        </select>
        <button className="predict-button" onClick={fetchPrediction} disabled={loadingPrediction}>
          {loadingPrediction ? "Predicting..." : "Predict Crypto with AI"}
        </button>
      </div>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

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
                  label: `${cryptoSymbol.toUpperCase()} Price`,
                  data: cryptoData,
                  borderColor: "black",
                  backgroundColor: "rgba(0, 255, 0, 0.5)",
                  barThickness: 5,
                  borderWidth: {
                    top: 1.5,
                    bottom: 1.5,
                    left: 0.5,
                    right: 0.5,
                  },
                },
              ],
            }}
            options={chartOptions}
          />
        )}
      </div>

      {showPrediction && predictionChartData && (
        <div className="chart-container">
          <Chart type="line" data={predictionChartData} options={chartOptions} />
        </div>
      )}

      {/* ✅ Secțiune știri */}
      <div className="news-container">
        <h2>Latest Crypto News</h2>
        {cryptoNews.length === 0 ? (
          <p>Loading news...</p>
        ) : (
          <ul className="news-list">
            {cryptoNews.map((article) => (
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

export default CryptoMarketPage;
