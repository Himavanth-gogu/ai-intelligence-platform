import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

const API_URL = "https://ai-intelligence-platform-4.onrender.com";

export default function App() {
  const [message, setMessage] = useState("");
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

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

  const deleteChat = (id) => {
    const updated = { ...chats };
    delete updated[id];
    setChats(updated);

    const remaining = Object.keys(updated);
    setCurrentChatId(remaining[0] || null);
  };

  const addMessage = (role, text, chatId) => {
    setChats(prev => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] || []),
        { role, text }
      ]
    }));
  };

  // PDF upload
  const uploadPDF = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData
    });

    addMessage("ai", "✅ PDF uploaded successfully.", currentChatId);
  };

  // Send message
  const sendMessage = async () => {
    if (!message.trim()) return;

    let chatId = currentChatId;

    if (!chatId) {
      chatId = Date.now().toString();
      setCurrentChatId(chatId);
      setChats(prev => ({ ...prev, [chatId]: [] }));
    }

    const userText = message;
    setMessage("");

    addMessage("user", userText, chatId);
    addMessage("ai", "", chatId);

    try {
      const res = await fetch(`${API_URL}/api/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: userText,
          session_id: chatId
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
          const msgs = [...updated[chatId]];
          msgs[msgs.length - 1].text += chunk;
          updated[chatId] = msgs;
          return updated;
        });
      }

    } catch {
      addMessage("ai", "⚠️ Error occurred.", chatId);
    }
  };

  const currentChat = chats[currentChatId] || [];

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <button style={styles.btn} onClick={createNewChat}>
          + New Chat
        </button>

        <button
          style={styles.btn}
          onClick={() => fileInputRef.current.click()}
        >
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
            <div key={id} style={styles.historyRow}>
              <div
                onClick={() => setCurrentChatId(id)}
                style={{
                  ...styles.historyItem,
                  background: id === currentChatId ? "#1a1a1a" : "transparent"
                }}
              >
                {(chats[id]?.[0]?.text || "New Chat").slice(0, 25)}
              </div>

              <button
                onClick={() => deleteChat(id)}
                style={styles.deleteBtn}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div style={styles.main}>

        {/* HEADER */}
        <div style={styles.header}>
          AI Intelligence Platform
        </div>

        {/* CHAT */}
        <div style={styles.chatArea}>
          {currentChat.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent:
                  msg.role === "user" ? "flex-end" : "flex-start"
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
    color: "#e5e5e5"
  },

  sidebar: {
    width: "240px",
    borderRight: "1px solid #222",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },

  btn: {
    padding: "10px",
    background: "#1a1a1a",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "6px"
  },

  history: {
    marginTop: "10px",
    overflowY: "auto"
  },

  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  historyItem: {
    padding: "8px",
    cursor: "pointer",
    borderRadius: "6px",
    flex: 1
  },

  deleteBtn: {
    background: "transparent",
    border: "none",
    color: "#777",
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
    marginBottom: "14px",
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
    background: "#1a1a1a",
    borderRadius: "12px",
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