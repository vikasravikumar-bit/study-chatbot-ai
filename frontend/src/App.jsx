import { useState, useRef, useEffect } from "react"
import "./App.css"

const SUBJECTS = ["General", "Math", "Science", "History", "English", "Computer Science"]

export default function App() {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your study assistant 📚 Select a subject and ask me anything! You can also upload your notes PDF!" }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState("General")
  const [pdfContext, setPdfContext] = useState("")
  const [pdfName, setPdfName] = useState("")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setPdfName(file.name)
    setMessages(prev => [...prev, { role: "bot", text: `📄 Uploading "${file.name}"...` }])

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-pdf", {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (data.text) {
        setPdfContext(data.text)
        setMessages(prev => [...prev, { 
          role: "bot", 
          text: `✅ PDF uploaded! "${file.name}" (${data.pages} pages). Now ask me anything about it!` 
        }])
      } else {
        setMessages(prev => [...prev, { role: "bot", text: "❌ Failed to read PDF. Try another file." }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "bot", text: "❌ Error uploading PDF!" }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMsg = { role: "user", text: input }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: input, 
          subject: subject,
          pdf_context: pdfContext
        })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: "bot", text: data.reply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: "bot", text: "Error connecting to server!" }])
    }

    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage()
  }

  return (
    <div className="app">
      <div className="header">
        <h1>📚 Study Assistant</h1>
        <p>Powered by AI — Ask anything, learn everything</p>
      </div>

      <div className="subject-bar">
        {SUBJECTS.map(s => (
          <button
            key={s}
            className={`subject-btn ${subject === s ? "active" : ""}`}
            onClick={() => setSubject(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {pdfName && (
        <div style={{
          background: "rgba(255,255,255,0.2)", color: "white",
          padding: "8px 16px", borderRadius: "10px", marginBottom: "10px",
          fontSize: "0.85rem", textAlign: "center"
        }}>
          📄 Active PDF: {pdfName}
          <button onClick={() => { setPdfContext(""); setPdfName("") }}
            style={{ marginLeft: "10px", background: "none", border: "none", 
            color: "white", cursor: "pointer", fontSize: "1rem" }}>✕</button>
        </div>
      )}

      <div className="chat-box">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="bubble">{msg.text}</div>
          </div>
        ))}
        {loading && <div className="typing">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <label style={{ cursor: "pointer", padding: "8px", fontSize: "1.3rem" }} title="Upload PDF">
          📎
          <input type="file" accept=".pdf" onChange={handlePdfUpload} style={{ display: "none" }} />
        </label>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={pdfName ? "Ask about your PDF..." : `Ask a ${subject} question...`}
        />
        <button className="send-btn" onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}