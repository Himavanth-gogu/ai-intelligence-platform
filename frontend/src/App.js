import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_URL = "http://127.0.0.1:8000";

export default function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [webMode, setWebMode] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load chats
  useEffect(() => {
    const saved = localStorage.getItem("chats");
    if (saved) {
      const parsed = JSON.parse(saved);
      setChats(parsed);
      const first = Object.keys(parsed)[0];
      if (first) setCurrentChatId(first);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, currentChatId]);

  // Create chat
  const createNewChat = () => {
    const id = Date.now().toString();
    setChats(prev => ({ ...prev, [id]: [] }));
    setCurrentChatId(id);
  };

  // Share chat
  const shareChat = () => {
    const chat = chats[currentChatId] || [];
    const text = chat.map(m => `${m.role}: ${m.text}`).join("\n\n");

    navigator.clipboard.writeText(text);
    alert("Chat copied! You can share it.");
  };

  // Upload PDF
  const uploadPDF = async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`${API_URL}/api/upload`, formData);

      addMessage("ai", "✅ PDF uploaded! Ask with 'pdf'");
    } catch {
      addMessage("ai", "❌ Upload failed");
    }
  };

  // Add message helper
  const addMessage = (role, text) => {
    setChats(prev => ({
      ...prev,
      [currentChatId]: [
        ...(prev[currentChatId] || []),
        { role, text }
      ]
    }));
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message;
    setMessage("");

    addMessage("user", userText);
    setLoading(true);

    try {
      let res;
      let text = "";

      if (webMode) {
        res = await axios.get(`${API_URL}/api/search?q=${userText}`);
        text = res.data.answer;
      } else if (userText.toLowerCase().includes("pdf")) {
        res = await axios.post(`${API_URL}/api/ask`, {
          question: userText
        });
        text = res.data.answer;
      } else {
        res = await axios.post(`${API_URL}/api/chat`, {
          message: userText
        });
        text = res.data.response;
      }

      addMessage("ai", text);

    } catch {
      addMessage("ai", "⚠️ Error occurred");
    }

    setLoading(false);
  };

  return (
    <div style={{
      display: "flex",
      height: "100vh",
      background: "#0b0f17",
      color: "white"
    }}>

      {/* SIDEBAR */}
      <div style={{
        width: "260px",
        borderRight: "1px solid #1f2937",
        padding: "10px",
        display: "flex",
        flexDirection: "column"
      }}>

        <button onClick={createNewChat} style={btn}>
          + New Chat
        </button>

        <button onClick={shareChat} style={btn}>
          Share Chat
        </button>

        <button
          onClick={() => fileInputRef.current.click()}
          style={btn}
        >
          Upload PDF
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => uploadPDF(e.target.files[0])}
          style={{ display: "none" }}
        />

        <hr />

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {Object.keys(chats).map(id => (
            <div key={id}
              onClick={() => setCurrentChatId(id)}
              style={{
                padding: "8px",
                cursor: "pointer",
                background: id === currentChatId ? "#1f2937" : "transparent"
              }}>
              {(chats[id]?.[0]?.text || "New Chat").slice(0, 20)}
            </div>
          ))}
        </div>

        <label>
          <input
            type="checkbox"
            checked={webMode}
            onChange={() => setWebMode(!webMode)}
          /> Web Search
        </label>

      </div>

      {/* MAIN */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column"
      }}>

        {/* CHAT */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "30px",
          maxWidth: "900px",
          margin: "0 auto"
        }}>

          {(chats[currentChatId] || []).map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "15px"
            }}>
              <div style={{
                maxWidth: "70%",
                lineHeight: "1.5"
              }}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}

          {loading && <p>Thinking...</p>}

          <div ref={chatEndRef}></div>
        </div>

        {/* INPUT */}
        <div style={{
          padding: "15px",
          borderTop: "1px solid #1f2937"
        }}>
          <div style={{
            display: "flex",
            maxWidth: "900px",
            margin: "0 auto",
            background: "#111827",
            padding: "10px",
            borderRadius: "10px"
          }}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Message AI..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                color: "white",
                outline: "none"
              }}
            />

            <button onClick={sendMessage} style={{
              marginLeft: "10px",
              cursor: "pointer"
            }}>
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const btn = {
  marginBottom: "8px",
  padding: "8px",
  background: "transparent",
  border: "1px solid #374151",
  color: "white",
  cursor: "pointer"
};