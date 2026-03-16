from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from groq import Groq

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

app = FastAPI()

# Enable CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ADD YOUR GROQ KEY HERE
from dotenv import load_dotenv
load_dotenv()
import os
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

vector_store = None


class ChatRequest(BaseModel):
    message: str


class PDFQuestion(BaseModel):
    question: str


@app.get("/")
def home():
    return {"message": "AI Server Running"}


# ---------------- NORMAL CHAT ----------------

@app.post("/chat")
def chat(data: ChatRequest):

    completion = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": data.message}]
    )

    return {"response": completion.choices[0].message.content}


# ---------------- PDF UPLOAD ----------------

@app.post("/upload_pdf")
def upload_pdf(file: UploadFile = File(...)):

    global vector_store

    file_path = f"temp_{file.filename}"

    with open(file_path, "wb") as f:
        f.write(file.file.read())

    loader = PyPDFLoader(file_path)
    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    docs = splitter.split_documents(documents)

    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    vector_store = Chroma.from_documents(docs, embeddings)

    return {"message": "PDF uploaded successfully"}


# ---------------- ASK PDF ----------------

@app.post("/ask_pdf")
def ask_pdf(data: PDFQuestion):

    global vector_store

    if vector_store is None:
        return {"answer": "Please upload a PDF first."}

    docs = vector_store.similarity_search(data.question, k=3)

    context = "\n".join([doc.page_content for doc in docs])

    prompt = f"""
Answer the question using the context below.

Context:
{context}

Question:
{data.question}
"""

    completion = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}]
    )

    return {"answer": completion.choices[0].message.content}