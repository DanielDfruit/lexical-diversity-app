from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from gutenbergpy.textget import get_text_by_id
from utils import compute_ttr_series, clean_text

app = FastAPI()

# CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your Netlify domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Lexical Diversity API is running"}

@app.get("/ttr")
def get_ttr(
    book_id: int = Query(..., description="Project Gutenberg Book ID"),
    window_size: int = Query(200, ge=10, le=1000, description="Size of the rolling window"),
    step: int = Query(50, ge=1, le=1000, description="Step between windows")
):
    try:
        raw = get_text_by_id(book_id)
        text = clean_text(raw)
        ttr_series = compute_ttr_series(text, window_size=window_size, step=step)
        return {
            "book_id": book_id,
            "length": len(ttr_series),
            "window_size": window_size,
            "step": step,
            "ttr_curve": ttr_series
        }
    except Exception as e:
        return {"error": str(e)}
