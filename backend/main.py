from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

from groq import Groq

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

vector_store = None

@app.get("/api/test")
def test():
    return {"message": "Backend is working 🚀"}


class ChatRequest(BaseModel):
    message: str


@app.post("/api/chat")
def chat(data: ChatRequest):
    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": data.message}]
        )
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/upload")
def upload_pdf(file: UploadFile = File(...)):
    global vector_store

    try:
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

        return {"message": "PDF processed successfully"}

    except Exception as e:
        return {"error": str(e)}


class PDFQuestion(BaseModel):
    question: str


@app.post("/api/ask")
def ask_pdf(data: PDFQuestion):
    global vector_store

    try:
        if vector_store is None:
            return {"answer": "Upload PDF first", "pages": []}

        docs = vector_store.similarity_search(data.question, k=3)

        context = "\n".join([doc.page_content for doc in docs])
        pages = list(set([doc.metadata.get("page", 0) + 1 for doc in docs]))

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