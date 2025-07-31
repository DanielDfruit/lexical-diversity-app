from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from gutenbergpy.textget import get_text_by_id
from utils import compute_ttr_series_cumulative, compute_ttr_series_rolling, clean_text

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from gutenbergpy.gutenbergcache import GutenbergCache

cache = GutenbergCache.get_cache()

@app.get("/search")
def search_books(query: str):
    query_lower = query.lower()
    matches = [
        {
            "id": book["id"],
            "title": book.get("title", "Unknown Title"),
            "author": book.get("author", "Unknown Author")
        }
        for book in cache.records
        if query_lower in book.get("title", "").lower()
        or query_lower in book.get("author", "").lower()
    ]
    return {"results": matches[:25]}  # limit to 25 results



@app.get("/")
def root():
    return {"message": "Lexical Diversity API is running"}

@app.get("/ttr")
def get_ttr(
    book_id: int = Query(...),
    mode: str = Query("cumulative", regex="^(cumulative|rolling)$"),
    window_size: int = Query(200, ge=10, le=1000),
    step: int = Query(50, ge=1, le=1000)
):
    try:
        raw = get_text_by_id(book_id)
        text = clean_text(raw)

        if mode == "cumulative":
            ttr_series = compute_ttr_series_cumulative(text)
        else:
            ttr_series = compute_ttr_series_rolling(text, window_size=window_size, step=step)

        return {
            "book_id": book_id,
            "mode": mode,
            "length": len(ttr_series),
            "window_size": window_size if mode == "rolling" else None,
            "step": step if mode == "rolling" else None,
            "ttr_curve": ttr_series
        }
    except Exception as e:
        return {"error": str(e)}
