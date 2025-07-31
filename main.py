import nltk
import os

# Manually set download dir (helps with Render compatibility)
nltk_data_dir = os.path.join(os.getcwd(), 'nltk_data')
nltk.download('punkt', download_dir=nltk_data_dir)

# Make sure nltk uses this dir when loading
nltk.data.path.append(nltk_data_dir)
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import traceback

from gutenbergpy.textget import get_text_by_id
from gutenbergpy.gutenbergcache import GutenbergCache
from utils import compute_ttr_series_cumulative, compute_ttr_series_rolling, clean_text

app = FastAPI()

# 👇 Add this block early, after initializing app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://beautiful-rabanadas-cbdf08.netlify.app"],  # or ["*"] for dev
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

from fastapi import HTTPException
import traceback

@app.get("/ttr")
def get_ttr(
    book_id: int = Query(...),
    mode: str = Query("cumulative", regex="^(cumulative|rolling)$"),
    window_size: int = Query(200, ge=10, le=1000),
    step: int = Query(50, ge=1, le=1000)
):
    import traceback
    try:
        raw = get_text_by_id(book_id)
        print(f"DEBUG: Type of raw: {type(raw)}")
        if isinstance(raw, bytes):
            print(f"DEBUG: Raw preview (bytes): {raw[:500]}")
            raw_text = raw.decode('utf-8', errors='ignore')
        elif isinstance(raw, str):
            print(f"DEBUG: Raw preview (str): {raw[:500]}")
            raw_text = raw
        else:
            raise TypeError(f"Unexpected return type from get_text_by_id: {type(raw)}")

        # Safety check
        if not raw_text or len(raw_text.strip()) < 1000:
            raise ValueError("Text too short or empty after decoding.")

        text = clean_text(raw_text)

        if not text or len(text.split()) < 100:
            raise ValueError("Text too short after cleaning.")

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
        print("Full exception:\n", traceback.format_exc())
        return {"error": f"Could not process book {book_id}. Reason: {str(e)}"}
