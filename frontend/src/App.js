import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Document, Page } from "react-pdf";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    // Add user message
    setChat(prev => [...prev, { role: "user", text: message }]);
    setMessage("");

    // Start loading
    setLoading(true);

    // Add empty AI message
    setChat(prev => [...prev, { role: "ai", text: "", pages: [] }]);

    try {
      let res;

      if (message.toLowerCase().includes("pdf")) {
        res = await axios.post(`${API_URL}/api/ask`, {
          question: message,
        });

        updateLast(res.data.answer, res.data.pages);
      } else {
        res = await axios.post(`${API_URL}/api/chat`, {
          message: message,
        });

        updateLast(res.data.response, []);
      }
    } catch (err) {
      updateLast("⚠️ Something went wrong", []);
    }

    // Stop loading
    setLoading(false);
  };

  const updateLast = (text, pages) => {
    setChat(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: "ai",
        text,
        pages,
      };
      return updated;
    });
  };

  const uploadPDF = async (file) => {
    setPdfFile(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    await axios.post(`${API_URL}/api/upload`, formData);

    setChat(prev => [
      ...prev,
      {
        role: "ai",
        text: "✅ PDF uploaded! Ask using 'pdf'",
      },
    ]);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "linear-gradient(135deg,#020617,#0f172a,#020617)",
        color: "white",
        fontFamily: "Inter",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: "260px",
          padding: "20px",
          borderRight: "1px solid #1e293b",
        }}
      >
        <h2>🤖 AI Assistant</h2>

        <button
          onClick={() => fileInputRef.current.click()}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            borderRadius: "10px",
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            color: "white",
            fontWeight: "bold",
            boxShadow: "0 8px 25px rgba(59,130,246,0.6)",
            cursor: "pointer",
          }}
        >
          Upload PDF
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => uploadPDF(e.target.files[0])}
          style={{ display: "none" }}
        />
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* HEADER */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <h2>AI PDF Chat</h2>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, display: "flex" }}>
          {/* CHAT AREA */}
          <div
            style={{
              flex: 2,
              padding: "20px",
              overflowY: "auto",
            }}
          >
            {chat.length === 0 && (
              <div style={{ textAlign: "center", marginTop: "80px" }}>
                <h2>🚀 AI PDF Assistant</h2>
                <p>Upload PDF and ask anything</p>
              </div>
            )}

            {chat.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    c.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: "15px",
                }}
              >
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background:
                      c.role === "user" ? "#2563eb" : "#1e293b",
                  }}
                >
                  {c.text}

                  {c.pages && c.pages.length > 0 && (
                    <div style={{ fontSize: "12px", marginTop: "5px" }}>
                      📄 Page:
                      {c.pages.map((p, i) => (
                        <span
                          key={i}
                          onClick={() => setCurrentPage(p)}
                          style={{
                            marginLeft: "5px",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* ✅ LOADING INDICATOR */}
            {loading && (
              <p style={{ color: "#94a3b8" }}>AI is typing...</p>
            )}

            <div ref={chatEndRef}></div>
          </div>

          {/* PDF VIEWER */}
          {pdfFile && (
            <div
              style={{
                width: "400px",
                borderLeft: "1px solid #1e293b",
                padding: "10px",
              }}
            >
              <Document file={pdfFile}>
                <Page pageNumber={currentPage} />
              </Document>
            </div>
          )}
        </div>

        {/* INPUT */}
        <div style={{ display: "flex", padding: "15px" }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask something..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              background: "#1e293b",
              color: "white",
            }}
          />

          <button
            onClick={sendMessage}
            style={{
              marginLeft: "10px",
              padding: "12px 18px",
              background: "#22c55e",
              border: "none",
              borderRadius: "10px",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;