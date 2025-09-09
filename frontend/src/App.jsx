import { useEffect, useRef, useState } from "react";
import axios from "axios";
import "./styles.css";

export default function App() {
  const [msg, setMsg] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [section, setSection] = useState("docs");
  const [history, setHistory] = useState([]);
  const [activeId, setActiveId] = useState(null);

  const listRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aou_chat_history") || "[]");
      setHistory(saved);
      if (saved.length) {
        setActiveId(saved[saved.length - 1].id);
        setItems(saved[saved.length - 1].items);
        setShowIntro(false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items, loading]);

  useEffect(() => {
    localStorage.setItem("aou_chat_history", JSON.stringify(history));
  }, [history]);

  const newChat = () => {
    const id = Date.now().toString();
    const title = new Date().toLocaleString();
    const chat = { id, title, ts: Date.now(), items: [] };
    setHistory((h) => [...h, chat]);
    setActiveId(id);
    setItems([]);
    setShowIntro(false);
  };

  const switchChat = (id) => {
    const c = history.find((x) => x.id === id);
    if (!c) return;
    setActiveId(id);
    setItems(c.items);
    setShowIntro(false);
  };

  const exportChat = () => {
    const active = history.find((x) => x.id === activeId) || { items };
    const lines = (active.items || items).map((m) => `${m.role === "user" ? "You" : "Bot"}: ${m.text}`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `chat_${activeId || "current"}.txt`;
    a.click();
  };

  const saveActive = (newItems) => {
    setItems(newItems);
    if (!activeId) return;
    setHistory((h) => h.map((c) => (c.id === activeId ? { ...c, items: newItems, title: c.title } : c)));
  };

  const send = async (e) => {
    e.preventDefault();
    const text = msg.trim();
    if (!text) return;
    const next = [...items, { role: "user", text }];
    saveActive(next);
    setMsg("");
    try {
      setLoading(true);
      const res = await axios.post("http://127.0.0.1:8000/chat", { message: text });
      const ans = res?.data?.answer ?? "ما وصل رد.";
      saveActive([...next, { role: "bot", text: ans }]);
    } catch (err) {
      saveActive([...next, { role: "bot", text: "خطأ في الاتصال بالخادم." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم المايكروفون (SpeechRecognition).\nBrowser does not support mic input.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-SA";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setMsg(transcript);
    };

    recognition.onerror = (event) => {
      console.error("Voice recognition error:", event.error);
      alert("حدث خطأ أثناء التعرف على الصوت.");
    };

    recognition.start();
  };

  return (
    <div className="app">
      <aside className="sidebar-left">
        <button className={`btn ${section === "docs" ? "" : "secondary"}`} onClick={() => setSection("docs")}>Documentation</button>
        <button className={`btn ${section === "faq" ? "" : "secondary"}`} onClick={() => setSection("faq")}>FAQ</button>
        <button className={`btn ${section === "support" ? "" : "secondary"}`} onClick={() => setSection("support")}>Support Services</button>
        <div className="hr"></div>
        <button className="btn light" onClick={exportChat}>Export Chat</button>
      </aside>

      <main className="main">
        <div className="header">
          <img src="/9849ba24c0ed44d9734d6efacd79a536-md.jpg" alt="logo" />
          <h1>AOUSupportBot</h1>
        </div>

        <div className="content">
          <div className="chat-wrap">
            {showIntro ? (
              <div className="intro">
                <h2>Welcome to AOUSupportBot!</h2>
                <p className="small">Here are a few things you can ask:</p>
                <ul>
                  <li>Overview of AOU support services.</li>
                  <li>Specific services (IT, exams, financial, library…).</li>
                  <li>Example: “كيف أسترجع كلمة مرور البريد الجامعي؟”.</li>
                </ul>
                <div style={{ marginTop: 12 }}>
                  <button className="btn light" onClick={() => setShowIntro(false)}>Got it</button>
                </div>
              </div>
            ) : (
              <>
                <div ref={listRef} className="msg-list">
                  {items.map((it, i) => (
                    <div key={i} className={`msg ${it.role}`}>
                      <div className="bubble">{it.text}</div>
                    </div>
                  ))}
                  {loading && <div className="small">...يُحضّر الرد</div>}
                </div>
                <form onSubmit={send} className="input-bar">
                  <input
                    placeholder="Type your query here..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                  <button
                    type="button"
                    title="Voice Input"
                    style={{
                      padding: "0 10px",
                      fontSize: 18,
                      background: "#eee",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      cursor: "pointer",
                      marginRight: 5,
                    }}
                    onClick={handleVoiceInput}
                  >
                    🎤
                  </button>
                  <button disabled={loading}>Send</button>
                </form>
              </>
            )}
          </div>

          <aside className="sidebar-right">
            <button className="btn full" onClick={newChat}>New Chat</button>
            <div className="card">
              <p className="title-sm">History</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(history.length ? history : []).map((c) => (
                  <div
                    key={c.id}
                    className={`chat-item ${activeId === c.id ? "active" : ""}`}
                    onClick={() => switchChat(c.id)}
                    title={c.title}
                  >
                    {c.title}
                  </div>
                ))}
                {!history.length && <div className="small">No chats yet.</div>}
              </div>
            </div>
          </aside>
        </div>

        <div style={{ padding: 12, display: section ? "block" : "none" }}>
          {section === "docs" && (
            <div className="card">
              <p className="title-sm">Documentation</p>
              <p className="small">ضع هنا روابط/نصائح الاستخدام وتعليمات الخصوصية وحدود الاستخدام.</p>
            </div>
          )}
          {section === "faq" && (
            <div className="card">
              <p className="title-sm">FAQ</p>
              <p className="small">أسئلة شائعة مختصرة (من kb.csv) أو روابط للأقسام المهمة.</p>
            </div>
          )}
          {section === "support" && (
            <div className="card">
              <p className="title-sm">Support Services</p>
              <p className="small">أضف أرقام/روابط تواصل مع الدعم في الجامعة.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
