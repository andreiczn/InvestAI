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
import { getCryptoNews, analyzeNewsSentiment, getRiskScore } from "./newsService";
import { motion, AnimatePresence } from "framer-motion";

import logo from "./assets/investAI.png";
import "./styling/CryptoMarketPage.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
);

const CryptoMarketPage = () => {
  const [cryptoSymbol, setCryptoSymbol] = useState("bitcoin");
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [chartKey, setChartKey] = useState(0);
  const [prediction, setPrediction] = useState(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);

  const [cryptoNews, setCryptoNews] = useState([]);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [explanationOpen, setExplanationOpen] = useState(false);

  const location = useLocation();

  // get user email
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) setUserEmail(user.email);
  }, []);

  // fetch historical OHLC
  const fetchCryptoData = async (symbol) => {
    setLoading(true);
    setErrorMessage("");
    try {
      const resp = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol}/market_chart?vs_currency=usd&days=90&interval=daily&x_cg_demo_api_key=CG-oYY9gdkcX6pr94DMeqcXzKmv`
      );
      const prices = resp.data.prices || [];
      if (!prices.length) {
        setErrorMessage("No crypto data available.");
        setLoading(false);
        return;
      }
      const formatted = prices.map(([ts, price], i, arr) => {
        const open = i === 0 ? price : arr[i - 1][1];
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.02);
        const low  = Math.min(open, close) * (1 - Math.random() * 0.02);
        return { x: new Date(ts), o: open, h: high, l: low, c: close };
      });
      setCryptoData(formatted);
      setChartKey(k => k + 1);
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to fetch crypto data. Please try again later.");
    }
    setLoading(false);
  };

  // fetch AI predictions
  const fetchPrediction = async () => {
    setLoadingPrediction(true);
    setShowPrediction(false);
    try {
      const res = await fetch("/predict/", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: cryptoSymbol })
      });
      if (!res.ok) throw new Error("Prediction error");
      const data = await res.json();
      setPrediction(data.predictions);
      setShowPrediction(true);
    } catch (e) {
      console.error(e);
      setPrediction(null);
    } finally {
      setLoadingPrediction(false);
    }
  };

  // fetch news + sentiment + risk whenever symbol changes
  useEffect(() => {
    fetchCryptoData(cryptoSymbol);
    getCryptoNews(cryptoSymbol).then(setCryptoNews);

    const doSentimentRisk = async () => {
      setLoadingRisk(true);
      const news = await getCryptoNews(cryptoSymbol);
      const sentiment = await analyzeNewsSentiment(news);
      const risk = await getRiskScore(cryptoSymbol, sentiment.average_sentiment, 30);
      setRiskData(risk);
      setLoadingRisk(false);
    };
    doSentimentRisk();
  }, [cryptoSymbol]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { type: "time", time: { unit: "day", tooltipFormat: "yyyy-MM-dd" }, ticks: { source: "auto" } },
      y: { beginAtZero: false }
    },
  };

  const predictionChartData = prediction && {
    labels: prediction.map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; }),
    datasets: [{
      label: `${cryptoSymbol.toUpperCase()} AI Prediction`,
      data: prediction,
      borderColor: "rgba(255,99,132,1)",
      backgroundColor: "rgba(255,99,132,0.2)",
      pointRadius: 2,
      fill: true,
    }],
  };

  return (
    <div className="crypto-container">
      <nav className="navbar">
        <div className="navbar-logo"><img src={logo} alt="InvestAI Logo" /></div>
        <div className="navbar-center">Hello, {userEmail}</div>
        <div className="navbar-links">
          <Link to="/"  className={location.pathname==="/" ? "active":""}>Home</Link>
          <Link to="/stocks"  className={location.pathname==="/stocks"?"active":""}>Stocks</Link>
          <Link to="/crypto"  className={location.pathname==="/crypto"?"active":""}>Crypto</Link>
          <Link to="/chat" className={location.pathname === "/chat" ? "active" : ""}>
                      Messages
                    </Link>
        </div>
      </nav>

      <div className="crypto-selector">
        <label>Select a Cryptocurrency:</label>
        <select value={cryptoSymbol} onChange={e=>setCryptoSymbol(e.target.value)}>
          <option value="bitcoin">Bitcoin (BTC)</option>
          <option value="ethereum">Ethereum (ETH)</option>
          <option value="ripple">Ripple (XRP)</option>
          <option value="cardano">Cardano (ADA)</option>
          <option value="dogecoin">Dogecoin (DOGE)</option>
        </select>
        <button
          className="predict-button"
          onClick={fetchPrediction}
          disabled={loadingPrediction}
        >
          {loadingPrediction ? "Predicting..." : "Predict Crypto with AI"}
        </button>
      </div>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="chart-container">
        {loading
          ? <p>Loading...</p>
          : <Chart
              key={chartKey}
              type="candlestick"
              data={{ datasets: [{ label:`${cryptoSymbol.toUpperCase()} Price`, data:cryptoData, borderColor:"black", backgroundColor:"rgba(0,255,0,0.5)", barThickness:5 }] }}
              options={chartOptions}
            />
        }
      </div>

      {showPrediction && predictionChartData && (
        <div className="chart-container">
          <Chart type="line" data={predictionChartData} options={chartOptions} />
        </div>
      )}

      {/* risk verdict + animated explanation */}
      {loadingRisk ? (
        <p style={{ color: "white", textAlign: "center" }}>🔄 Analyzing risk...</p>
      ) : (
        <AnimatePresence>
          {riskData && (
            <motion.div
              className="risk-verdict-container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5 }}
            >
              <h3>📊 AI Risk Verdict</h3>
              <p><strong>Risk Score:</strong> {riskData.risk_score}/100</p>
              <p>
                <strong>Verdict:</strong>{" "}
                <span className={`verdict-${riskData.verdict.replace(" ","").toLowerCase()}`}>
                  {riskData.verdict}
                </span>
              </p>
              <button
                className="explanation-toggle"
                onClick={()=>setExplanationOpen(o=>!o)}
              >
                {explanationOpen ? "▼ Hide details" : "❓ How is this calculated?"}
              </button>
              <AnimatePresence initial={false}>
                {explanationOpen && (
                  <motion.div
                    className="explanation-content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ul>
                      <li>
                        <strong>Sentiment Score</strong> = normalize(average_sentiment) = (sentiment + 1) / 2  
                        <em> (how positive/negative the news tone is)</em>
                      </li>
                      <li>
                        <strong>Volatility Score</strong> = σ(daily returns)  
                        <em> (how “jumpy” the price has been)</em>
                      </li>
                      <li>
                        <strong>Model Confidence</strong> = fixed coefficient (0.8)  
                        <em> (our LSTM model’s confidence)</em>
                      </li>
                    </ul>
                    <p>
                      Final formula:<br/>
                      <code>
                        risk_score = 100 × [0.4×(1−SentimentScore) + 0.4×VolatilityScore + 0.2×(1−ModelConfidence)]
                      </code>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* news section */}
      <div className="news-container">
        <h2>Latest Crypto News</h2>
        {cryptoNews.length === 0 ? (
          <p>Loading news...</p>
        ) : (
          <ul className="news-list">
            {cryptoNews.map((a) => (
              <li key={a.uuid} className="news-item">
                <a href={a.url} target="_blank" rel="noreferrer"><strong>{a.title}</strong></a>
                <p className="news-meta">{a.source} – {new Date(a.published_at).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CryptoMarketPage;
