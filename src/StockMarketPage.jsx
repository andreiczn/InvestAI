import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";  // http client
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
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { logout } from "./authService";


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
 const AV_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
const StockMarketPage = () => {
  const [stockSymbol, setStockSymbol] = useState("AAPL"); // selected stock
  const [stockData, setStockData] = useState([]); // price data
  const [loading, setLoading] = useState(true); // loading state
  const [userEmail, setUserEmail] = useState(""); // user email
  const location = useLocation(); // current route
  const [errorMessage, setErrorMessage] = useState(""); // error text
  const [chartKey, setChartKey] = useState(0); // force chart reload
  const [prediction, setPrediction] = useState(null); // ai predictions
  const [loadingPrediction, setLoadingPrediction] = useState(false); // pred loading
  const [showPrediction, setShowPrediction] = useState(false); // show pred
  const [stockNews, setStockNews] = useState([]); // news articles
  const [riskData, setRiskData] = useState(null); // risk result
  const [loadingRisk, setLoadingRisk] = useState(false); // risk loading
  const [explanationOpen, setExplanationOpen] = useState(false); // exp toggle
  const navigate = useNavigate(); // nav hook
 

  const handleSignOut = async () => {
    try {
      await logout();                        
      navigate("/auth", { replace: true });  // redirect
    } catch (err) {
      console.error("Logout error:", err);  
    }
  };
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);   // set email on mount
    }
  }, []);
  useEffect(() => {
    const fetchSentimentAndRisk = async () => {
      setLoadingRisk(true);  // start risk load
      const news = await getStockNews(stockSymbol);  // fetch news
      const sentiment = await analyzeNewsSentiment(news);  // get sentiment
  
      console.log("Sentiment analysis result:", sentiment);
  
      const risk = await getRiskScore(stockSymbol, sentiment.average_sentiment, 30);  // calc risk
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
        `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${AV_KEY}`
      );  // fetch stock data
      

      if (response.data["Note"]) {
        setErrorMessage("API limit reached. Try again tomorrow or use a different API key."); // limit msg (25 reqs)
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
        .map(([date, values]) => ({  // format for candlestick
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
    setLoadingPrediction(true); // start pred
    setShowPrediction(false); 

    try {
      const response = await fetch("/predict/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ticker: stockSymbol }),  // send symbol
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
  }, [stockSymbol]);  // on symbol change

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
          <Link to="/chat" className={location.pathname === "/chat" ? "active" : ""}>
            Messages
          </Link>
          <button
            onClick={handleSignOut}
            className="navbar-link-button"
          >
            Sign Out
          </button>
        </div>
      </nav>


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

      {showPrediction && predictionChartData && (
        <div className="chart-container">
          <Chart type="line" data={predictionChartData} options={chartOptions} />
        </div>
      )}

      

     {loadingRisk ? (
       <p style={{ color: "white", textAlign: "center" }}>
         🔄 Analyzing risk...
       </p>
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
             <p>
               <strong>Risk Score:</strong> {riskData.risk_score}/100
             </p>
             <p>
               <strong>Verdict:</strong>{" "}
               <span className={`verdict-${riskData.verdict.replace(" ", "").toLowerCase()}`}>
                 {riskData.verdict}
               </span>
             </p>
     
             
             <button
               className="explanation-toggle"
               onClick={() => setExplanationOpen(!explanationOpen)}
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
                       <strong>Sentiment Score (S<sub>s</sub>)</strong> = max(−average_sentiment, 0)  
                       <em> (captures only negative tone; 0 if news is neutral/positive)</em>
                     </li>
                     <li>
                       <strong>Volatility Score (S<sub>v</sub>)</strong> = min(σ(daily returns) / 0.05, 1.0)  
                       <em> (5% volatility → 1.0; below 5% scales proportionally)</em>
                     </li>
                     <li>
                       <strong>Trend Score (S<sub>t</sub>)</strong> = “maximum drop from any predicted price”  
                       <br />
                       &nbsp;&nbsp;&nbsp;1. p<sub>min</sub> = the lowest predicted price in the entire AI forecast array  
                       <br />
                       &nbsp;&nbsp;&nbsp;2. Δ = (p<sub>min</sub> − last_real) / last_real  
                       <br />
                       &nbsp;&nbsp;&nbsp;3. S<sub>t</sub> = min(|Δ|, 1.0) if Δ &lt; 0, otherwise 0  
                       <em> (measures how far the lowest prediction dips below the current price)</em>
                     </li>
                   </ul>
                   <p>
                     <strong>Final formula:</strong><br />
                     <code>
                       raw_risk = 1 − (1 − S<sub>s</sub>) × (1 − S<sub>t</sub>) × (1 − S<sub>v</sub>)<br />
                       risk_score = round(raw_risk × 100, 2)
                     </code>
                   </p>
                 </motion.div>
               )}
             </AnimatePresence>
           </motion.div>
         )}
       </AnimatePresence>
     )}


      
    
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
                </a>  {/* article link */}
                <p className="news-meta">
                  {article.source} – {new Date(article.published_at).toLocaleString()}
                </p> {/* meta */}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
};

export default StockMarketPage;