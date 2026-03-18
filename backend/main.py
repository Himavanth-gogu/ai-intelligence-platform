from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import requests
import tempfile

from groq import Groq
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Load env
load_dotenv()

app = FastAPI()

# CORS (Allow all)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq setup
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Temporary storage (lightweight)
pdf_chunks = []


# ---------------- TEST ----------------
@app.get("/api/test")
def test():
    return {"message": "Backend is working 🚀"}


# ---------------- NORMAL CHAT ----------------
class ChatRequest(BaseModel):
    message: str


@app.post("/api/chat")
def chat(data: ChatRequest):
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": data.message}]
        )

        return {
            "response": completion.choices[0].message.content
        }

    except Exception as e:
        return {"error": str(e)}


# ---------------- PDF UPLOAD ----------------
@app.post("/api/upload")
def upload_pdf(file: UploadFile = File(...)):
    global pdf_chunks

    try:
        # Save temp file (important for server)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file.file.read())
            file_path = tmp.name

        loader = PyPDFLoader(file_path)
        documents = loader.load()

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )

        pdf_chunks = splitter.split_documents(documents)

        return {"message": "PDF processed successfully"}

    except Exception as e:
        return {"error": str(e)}


# ---------------- ASK PDF ----------------
class PDFQuestion(BaseModel):
    question: str


@app.post("/api/ask")
def ask_pdf(data: PDFQuestion):
    global pdf_chunks

    try:
        if not pdf_chunks:
            return {"answer": "Upload PDF first", "pages": []}

        # Take first few chunks (lightweight)
        docs = pdf_chunks[:3]

        context = "\n".join([doc.page_content for doc in docs])

        pages = list(set([
            doc.metadata.get("page", 0) + 1 for doc in docs
        ]))

        prompt = f"""
Answer using the context below:

{context}

Question: {data.question}
"""

        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}]
        )

        return {
            "answer": completion.choices[0].message.content,
            "pages": pages
        }

    except Exception as e:
        return {"error": str(e)}


# ---------------- WEB SEARCH ----------------
@app.get("/api/search")
def web_search(q: str = Query(...)):
    try:
        url = f"https://api.duckduckgo.com/?q={q}&format=json"
        res = requests.get(url).json()

        answer = res.get("AbstractText", "")
        source = res.get("AbstractURL", "")

        if not answer:
            answer = "No direct answer found. Try refining your query."

        return {
            "answer": answer,
            "sources": [source] if source else []
        }

    except Exception as e:
        return {
            "answer": "Search failed",
            "sources": [],
            "error": str(e)
        }