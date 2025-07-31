from fastapi import FastAPI
from utils import compute_ttr_series, clean_text
from gutenbergpy.textget import get_text_by_id
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins; secure later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Lexical Diversity API is running"}

@app.get("/ttr")
def get_ttr(book_id: int):
    raw = get_text_by_id(book_id)
    text = clean_text(raw)
    ttr_series = compute_ttr_series(text)
    return {
        "book_id": book_id,
        "length": len(ttr_series),
        "ttr_curve": ttr_series
    }
