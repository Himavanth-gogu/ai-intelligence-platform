import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "https://ai-intelligence-platform-4.onrender.com";

export default function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  // Load chats
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("chats") || "{}");
    if (Object.keys(saved).length) {
      setChats(saved);
      setCurrentChatId(Object.keys(saved)[0]);
    } else {
      createNewChat();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats]);

  const createNewChat = () => {
    const id = Date.now().toString();
    setChats(prev => ({ ...prev, [id]: [] }));
    setCurrentChatId(id);
  };

  const addMessage = (role, text) => {
    setChats(prev => ({
      ...prev,
      [currentChatId]: [
        ...(prev[currentChatId] || []),
        { role, text }
      ]
    }));
  };

  // 🔥 PDF Upload
  const uploadPDF = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData
      });

      addMessage("ai", "✅ PDF uploaded. You can now ask questions.");
    } catch {
      addMessage("ai", "❌ PDF upload failed.");
    }
  };

  // 🔥 Streaming Chat
  const sendMessage = async () => {
    if (!message.trim()) return;

    const userText = message;
    setMessage("");

    addMessage("user", userText);

    // empty AI message
    setChats(prev => {
      const updated = { ...prev };
      updated[currentChatId].push({ role: "ai", text: "" });
      return updated;
    });

    try {
      const res = await fetch(`${API_URL}/api/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          session_id: currentChatId
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        const chunk = decoder.decode(value || new Uint8Array());

        setChats(prev => {
          const updated = { ...prev };
          const msgs = [...updated[currentChatId]];
          msgs[msgs.length - 1].text += chunk;
          updated[currentChatId] = msgs;
          return updated;
        });
      }

    } catch {
      addMessage("ai", "⚠️ Server error.");
    }
  };

  const currentChat = chats[currentChatId] || [];

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <button onClick={createNewChat}>+ New Chat</button>

        <button onClick={() => fileInputRef.current.click()}>
          Upload PDF
        </button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => uploadPDF(e.target.files[0])}
        />

        <div style={styles.history}>
          {Object.keys(chats).map(id => (
            <div
              key={id}
              onClick={() => setCurrentChatId(id)}
              style={{
                ...styles.historyItem,
                background: id === currentChatId ? "#1a1a1a" : "transparent"
              }}
            >
              {(chats[id]?.[0]?.text || "New Chat").slice(0, 25)}
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        <div style={styles.header}>
          AI Intelligence Platform
        </div>

        {/* CHAT AREA */}
        <div style={styles.chatArea}>
          {currentChat.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                marginBottom: "14px"
              }}
            >
              <div style={styles.bubble}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        {/* INPUT */}
        <div style={styles.inputWrapper}>
          <div style={styles.inputBox}>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message AI..."
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              style={styles.input}
            />
            <button onClick={sendMessage} style={styles.send}>
              ➤
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#0d0d0d",
    color: "#e5e5e5",
    fontFamily: "system-ui"
  },

  sidebar: {
    width: "240px",
    borderRight: "1px solid #222",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  history: {
    marginTop: "10px",
    overflowY: "auto",
    flex: 1
  },

  historyItem: {
    padding: "8px",
    borderRadius: "6px",
    cursor: "pointer"
  },

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },

  header: {
    padding: "12px",
    borderBottom: "1px solid #222"
  },

  chatArea: {
    flex: 1,
    padding: "30px",
    maxWidth: "900px",
    margin: "0 auto",
    width: "100%",
    overflowY: "auto"
  },

  bubble: {
    background: "#1a1a1a",
    borderRadius: "14px",
    padding: "12px 16px",
    maxWidth: "60%"
  },

  inputWrapper: {
    padding: "16px",
    borderTop: "1px solid #222"
  },

  inputBox: {
    display: "flex",
    maxWidth: "900px",
    margin: "0 auto",
    borderRadius: "12px",
    background: "#1a1a1a",
    padding: "10px"
  },

  input: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#fff"
  },

  send: {
    border: "none",
    background: "transparent",
    color: "#aaa",
    cursor: "pointer"
  }
};