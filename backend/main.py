from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os
import io
from dotenv import load_dotenv

load_dotenv()  # works locally

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

class Message(BaseModel):
    message: str
    subject: str = "General"
    pdf_context: str = ""

@app.get("/")
def root():
    return {"status": "Study Chatbot API running"}

@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        import pypdf
        contents = await file.read()
        pdf_reader = pypdf.PdfReader(io.BytesIO(contents))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return {"text": text[:5000], "pages": len(pdf_reader.pages)}
    except Exception as e:
        return {"error": str(e)}

@app.post("/chat")
def chat(msg: Message):
    system_prompt = f"""You are a helpful study assistant for {msg.subject}. 
    Explain concepts clearly and simply. Use examples. Break down complex topics into easy steps."""
    
    if msg.pdf_context:
        system_prompt += f"\n\nThe student has uploaded notes. Use this context to answer:\n{msg.pdf_context}"

    response = get_client().chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": msg.message}
        ]
    )
    return {"reply": response.choices[0].message.content}