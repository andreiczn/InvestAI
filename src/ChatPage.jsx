// ChatPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./styling/ChatPage.css";
import logo from "./assets/investAI.png";
import { getAuth } from "firebase/auth";

const Navbar = () => {
  const location = useLocation();
  const auth = getAuth();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUserEmail(u.email);
  }, [auth]);

  return (
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
        <Link
          to="/chat"
          className={location.pathname === "/chat" ? "active" : ""}
        >
          Messages
        </Link>
      </div>
    </nav>
  );
};

const ChatPage = () => {
  const auth = getAuth();
  const [userUID, setUserUID] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [usersEmails, setUsersEmails] = useState({});
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const messagesEndRef = useRef(null);

  // scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // get current user UID
  useEffect(() => {
    const u = auth.currentUser;
    if (u) setUserUID(u.uid);
  }, [auth]);

  // fetch conversations
  useEffect(() => {
    if (!userUID) return;
    const fetchConvos = async () => {
      const messagesRef = collection(db, "messages");
      const qSent = query(messagesRef, where("senderId", "==", userUID));
      const qRecv = query(messagesRef, where("recieverId", "==", userUID));
      const [sentSnap, recvSnap] = await Promise.all([
        getDocs(qSent),
        getDocs(qRecv),
      ]);
      const all = [...sentSnap.docs, ...recvSnap.docs].map((d) => d.data());

      // unique partner UIDs
      const uids = Array.from(
        new Set(
          all
            .flatMap((m) => [m.senderId, m.recieverId])
            .filter((id) => id !== userUID)
        )
      );

      // map UID -> email
      const emailMap = {};
      await Promise.all(
        uids.map(async (uid) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) emailMap[uid] = userSnap.data().email;
        })
      );
      setUsersEmails(emailMap);

      // group messages by partner
      const convos = all.reduce((acc, m) => {
        const partner = m.senderId === userUID ? m.recieverId : m.senderId;
        if (!acc[partner])
          acc[partner] = { uid: partner, email: emailMap[partner], messages: [] };
        acc[partner].messages.push(m);
        return acc;
      }, {});

      setConversations(Object.values(convos));
      setLoading(false);
    };
    fetchConvos();
  }, [userUID]);

  const selectChat = (uid) => {
    setCurrentChat(uid);
    const convo = conversations.find((c) => c.uid === uid) || { messages: [] };
    const sorted = [...convo.messages].sort(
      (a, b) => a.timestamp.seconds - b.timestamp.seconds
    );
    setMessages(sorted);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentChat) return;
    const msgData = {
      message: newMessage.trim(),
      senderId: userUID,
      recieverId: currentChat,
      timestamp: serverTimestamp(),
    };
    await addDoc(collection(db, "messages"), msgData);
    setMessages((prev) => [...prev, msgData]);
    setNewMessage("");
  };

  const handleSearch = async () => {
    const email = searchEmail.trim();
    if (!email) return;
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return alert("User not found");
    const uid = snap.docs[0].id;
    if (!conversations.find((c) => c.uid === uid)) {
      setConversations((prev) => [...prev, { uid, email, messages: [] }]);
    }
    selectChat(uid);
  };

  return (
    <div className="chat-page">
      <Navbar />
      <div className="chat-wrapper">
        <aside className="chat-sidebar">
          <div className="search-container">
            <input
              className="search-input"
              placeholder="Search by email..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <button className="search-button" onClick={handleSearch}>
              🔍
            </button>
          </div>
          {loading ? (
            <p>Loading conversations...</p>
          ) : conversations.length ? (
            <ul className="convo-list">
              {conversations.map((c) => (
                <li
                  key={c.uid}
                  className={currentChat === c.uid ? "active" : ""}
                  onClick={() => selectChat(c.uid)}
                >
                  <span className="convo-email">{c.email}</span>
                  <span className="convo-preview">
                    {c.messages.slice(-1)[0]?.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No conversations.</p>
          )}
        </aside>

        <section className="chat-content">
          <header className="chat-header">
            {currentChat ? (
              <h3>Chat with {usersEmails[currentChat]}</h3>
            ) : (
              <h3>Select a conversation</h3>
            )}
          </header>

          <div className="chat-messages">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`message ${m.senderId === userUID ? "sent" : "received"}`}
              >
                <p>{m.message}</p>
                <small>
                  {m.timestamp.seconds
                    ? new Date(m.timestamp.seconds * 1000).toLocaleString()
                    : "Sending..."}
                </small>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <footer className="chat-input">
            <input
              className="chat-input-field"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button className="chat-send-button" onClick={handleSend}>
              ➤
            </button>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default ChatPage;
