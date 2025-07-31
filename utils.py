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

import re
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

def clean_text(text: str, exclude_stopwords: bool = False):
    text = re.sub(r'\r\n', ' ', text)
    start = text.find("*** START OF")
    end = text.find("*** END OF")
    if start != -1 and end != -1 and end > start:
        text = text[start:end]

    tokens = re.findall(r'\b\w+\b', text.lower())

    if exclude_stopwords:
        tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]

    return tokens

# --- Cumulative TTR ---
# --- Cumulative TTR ---
def compute_ttr_series_cumulative(tokens):
    seen = set()
    ttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        ttr = len(seen) / (i + 1)
        ttr_list.append({"position": i + 1, "ttr": ttr})
    return ttr_list

# --- Rolling window TTR ---
def compute_ttr_series_rolling(tokens, window_size=200, step=50):
    ttr_list = []
    for i in range(0, len(tokens) - window_size + 1, step):
        window = tokens[i:i + window_size]
        ttr = len(set(window)) / len(window)
        ttr_list.append({"position": i, "ttr": ttr})
    return ttr_list

def compute_rttr_series_cumulative(tokens):
    seen = set()
    rttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        length = i + 1
        rttr = len(seen) / (length ** 0.5)
        rttr_list.append({"position": length, "ttr": rttr})
    return rttr_list


def compute_cttr_series_cumulative(tokens):
    seen = set()
    cttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        length = i + 1
        cttr = len(seen) / ((2 * length) ** 0.5)
        cttr_list.append({"position": length, "ttr": cttr})
    return cttr_list
