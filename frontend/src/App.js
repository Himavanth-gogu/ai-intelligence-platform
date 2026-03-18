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

  const uploadPDF = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: formData
    });

    addMessage("ai", "✅ PDF uploaded.", currentChatId);
  };

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
      addMessage("ai", "⚠️ Error", chatId);
    }
  };

  const currentChat = chats[currentChatId] || [];

  return (
    <div style={styles.app}>

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

        {Object.keys(chats).map(id => (
          <div key={id} style={styles.row}>
            <div onClick={() => setCurrentChatId(id)} style={styles.chatItem}>
              {(chats[id]?.[0]?.text || "New Chat").slice(0, 20)}
            </div>
            <button onClick={() => deleteChat(id)}>✕</button>
          </div>
        ))}
      </div>

      <div style={styles.main}>
        <div style={styles.chat}>
          {currentChat.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start"
            }}>
              <div style={styles.bubble}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div style={styles.inputBox}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message AI..."
          />
          <button onClick={sendMessage}>➤</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", height: "100vh", background: "#0d0d0d", color: "#fff" },
  sidebar: { width: "240px", padding: "10px" },
  row: { display: "flex", justifyContent: "space-between" },
  chatItem: { cursor: "pointer" },
  main: { flex: 1, display: "flex", flexDirection: "column" },
  chat: { flex: 1, padding: "20px", overflowY: "auto" },
  bubble: { background: "#1a1a1a", padding: "10px", borderRadius: "10px", margin: "10px", maxWidth: "60%" },
  inputBox: { display: "flex", padding: "10px", background: "#1a1a1a" }
};