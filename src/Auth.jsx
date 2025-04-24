import React, { useState } from "react";
import { signup, login, googleSignIn } from "./authService";
import { useNavigate } from "react-router-dom"; 
import "./styling/Auth.css";
import logo from "./assets/investAI.png";
import glogo from "./assets/google.png";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [message, setMessage] = useState("");
  const navigate = useNavigate(); 

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/"); 
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await googleSignIn();
      navigate("/"); 
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <img src={logo} alt="InvestAI Logo" className="auth-logo" />
        <h1 className="auth-title">{isLogin ? "Login" : "Sign Up"}</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="auth-input"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="auth-input"
        />
        <button onClick={handleAuth} className="auth-button">
          {isLogin ? "Login" : "Sign Up"}
        </button>
        <button onClick={handleGoogleSignIn} className="auth-button auth-google">
          <img src={glogo} alt="Google Logo" className="google-icon" />
          Sign in with Google
        </button>
        <p onClick={() => setIsLogin(!isLogin)} className="auth-toggle">
          {isLogin ? "Don't have an account? Sign Up now" : "Already have an account? Login"}
        </p>
        {message && <p className="auth-message">{message}</p>}
      </div>
    </div>
  );
};

export default Auth;
