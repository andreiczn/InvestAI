import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Home from "./Home";
import Auth from "./Auth";
import StockMarketPage from "./StockMarketPage";
import CryptoMarketPage from "./CryptoMarketPage";
import ChatPage from "./ChatPage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener la unmount
  }, []);

  if (loading) return <p>Loading...</p>; // Prevenim flickering la verificarea autentificării

  return (
    <Router>
      <Routes>
        {/* Dacă userul NU e logat, mergem pe pagina de autentificare */}
        <Route path="/" element={user ? <Home /> : <Navigate to="/auth" />} />
        <Route path="/stocks" element={<StockMarketPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/crypto" element={<CryptoMarketPage />} />
        <Route path="/chat" element={<ChatPage />} />
        

      </Routes>
    </Router>
  );
}

export default App;
