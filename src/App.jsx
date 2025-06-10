import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Home from "./Home";
import Auth from "./Auth";
import StockMarketPage from "./StockMarketPage";
import CryptoMarketPage from "./CryptoMarketPage";
import ChatPage from "./ChatPage";
import { logout } from "./authService";

// Componentă simplă de “private route”
function PrivateRoute({ user }) {
  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}

// Componentă de “public route” pentru pagina de login/signup
function PublicRoute({ user }) {
  return !user ? <Outlet /> : <Navigate to="/" replace />;
}

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
        {/* Ruta publică: doar dacă nu e user te lasă în /auth */}
        <Route element={<PublicRoute user={user} />}>
          <Route path="/auth" element={<Auth />} />
        </Route>

        {/* Rute private: doar dacă e user le poţi accesa */}
        <Route element={<PrivateRoute user={user} />}>
          <Route path="/" element={<Home />} />
          <Route path="/stocks" element={<StockMarketPage />} />
          <Route path="/crypto" element={<CryptoMarketPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Route>

        {/* Fallback: orice altceva */}
        <Route
          path="*"
          element={
            user ? <Navigate to="/" replace /> : <Navigate to="/auth" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
