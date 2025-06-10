import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import logo from "./assets/investAI.png";
import stocksBanner from "./assets/stocks2.jpg";
import cryptoBanner from "./assets/blockchain.jpg";
import "./styling/Home.css";
import { useNavigate } from "react-router-dom";
import { logout } from "./authService";

const Home = () => {
  const [userEmail, setUserEmail] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const handleSignOut = async () => {
        try {
          await logout();                        // 1) firebase signOut
          navigate("/auth", { replace: true }); // 2) redirect la login
        } catch (err) {
          console.error("Logout error:", err);
        }
      };
  
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      setUserEmail(user.email);
    }
  }, []);

  // Folosim Intersection Observer pentru a anima secțiunile hero la scroll
  useEffect(() => {
    const heroSections = document.querySelectorAll(".hero-section");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.3 }
    );

    heroSections.forEach((section) => observer.observe(section));

    return () => {
      heroSections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  return (
    <div className="home-container">
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
          <Link
            to="/stocks"
            className={location.pathname === "/stocks" ? "active" : ""}
          >
            Stocks
          </Link>
          <Link
            to="/crypto"
            className={location.pathname === "/crypto" ? "active" : ""}
          >
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

      {/* Hero Banner pentru Stocks */}
      <section
        className="hero-section"
        style={{ backgroundImage: `url(${stocksBanner})` }}
      >
        <div className="hero-content">
          <h1>Stock Market Predictions</h1>
          <p>Utilize AI-powered analytics to predict stock trends.</p>
          <Link to="/stocks" className="cta-button">
            Explore
          </Link>
        </div>
      </section>

      {/* Hero Banner pentru Crypto */}
      <section
        className="hero-section"
        style={{ backgroundImage: `url(${cryptoBanner})` }}
      >
        <div className="hero-content">
          <h1>Cryptocurrency Insights</h1>
          <p>Get real-time crypto market insights and trends.</p>
          <Link to="/crypto" className="cta-button">
            Explore 
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
