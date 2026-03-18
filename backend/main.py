from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import asyncio
import tempfile

from groq import Groq
from pypdf import PdfReader

load_dotenv()

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Memory
chat_memory = {}

# PDF storage
pdf_text_chunks = []


class ChatRequest(BaseModel):
    message: str
    session_id: str


@app.get("/api/test")
def test():
    return {"message": "Backend working 🚀"}


# ---------------- PDF UPLOAD ----------------
@app.post("/api/upload")
async def upload_pdf(file: UploadFile = File(...)):
    global pdf_text_chunks

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file.file.read())
            file_path = tmp.name

        reader = PdfReader(file_path)

        full_text = ""
        for page in reader.pages:
            full_text += page.extract_text() or ""

        # 🔥 simple chunking
        chunk_size = 500
        pdf_text_chunks = [
            full_text[i:i + chunk_size]
            for i in range(0, len(full_text), chunk_size)
        ]

        return {"message": "PDF processed successfully"}

    except Exception as e:
        return {"error": str(e)}


# ---------------- STREAM CHAT ----------------
@app.post("/api/chat-stream")
async def chat_stream(data: ChatRequest):

    session_id = data.session_id

    if session_id not in chat_memory:
        chat_memory[session_id] = [
            {
                "role": "system",
                "content": "You are a helpful AI assistant."
            }
        ]

    user_msg = data.message.lower()

    # 🔥 PDF SEARCH (FAST)
    context = ""
    if pdf_text_chunks:
        matched_chunks = [
            chunk for chunk in pdf_text_chunks
            if any(word in chunk.lower() for word in user_msg.split())
        ][:3]

        context = "\n".join(matched_chunks)

    if context:
        final_prompt = f"""
Use the below PDF content to answer:

{context}

Question: {data.message}
"""
    else:
        final_prompt = data.message

    chat_memory[session_id].append({
        "role": "user",
        "content": final_prompt
    })

    async def generate():
        try:
            completion = groq_client.chat.completions.create(
                model="llama-3.1-70b-instruct",
                messages=chat_memory[session_id],
                stream=True
            )

            full_response = ""

            for chunk in completion:
                content = chunk.choices[0].delta.content or ""
                if content:
                    full_response += content
                    yield content
                    await asyncio.sleep(0.01)

            chat_memory[session_id].append({
                "role": "assistant",
                "content": full_response
            })

        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(generate(), media_type="text/plain")