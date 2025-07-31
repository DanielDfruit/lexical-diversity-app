from gutenbergpy.textget import get_text_by_id
from gutenbergpy import gutenbergcache
import re

# --- Simple tokenizer using regex ---
def tokenize_text(text: str):
    return re.findall(r"\b\w+\b", text.lower())

# --- Book search ---
def search_books(query, max_results=10):
    cache = gutenbergcache.GutenbergCache.get_cache()
    metadata = cache.df
    metadata = metadata.dropna(subset=["title"])
    query_lower = query.lower()

    matches = metadata[
        metadata["title"].str.lower().str.contains(query_lower, na=False)
        | metadata["author"].str.lower().str.contains(query_lower, na=False)
    ].head(max_results)

    return [
        {"id": int(row["id"]), "title": row["title"], "author": row.get("author", "")}
        for _, row in matches.iterrows()
    ]

# --- Strip boilerplate ---
def clean_text(text: str):
    text = re.sub(r'\r\n', ' ', text)
    start = text.find("*** START OF")
    end = text.find("*** END OF")
    if start != -1 and end != -1 and end > start:
        text = text[start:end]
    return text.strip()

# --- Cumulative TTR ---
def compute_ttr_series_cumulative(text):
    words = tokenize_text(text)
    seen = set()
    ttr_list = []
    for i, word in enumerate(words):
        seen.add(word)
        ttr = len(seen) / (i + 1)
        ttr_list.append({"position": i + 1, "ttr": ttr})
    return ttr_list

# --- Rolling window TTR ---
def compute_ttr_series_rolling(text, window_size=200, step=50):
    words = tokenize_text(text)
    ttr_list = []
    for i in range(0, len(words) - window_size + 1, step):
        window = words[i:i + window_size]
        ttr = len(set(window)) / len(window)
        ttr_list.append({"position": i, "ttr": ttr})
    return ttr_list

