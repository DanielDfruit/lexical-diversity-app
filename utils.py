from gutenbergpy.textget import get_text_by_id
from nltk.tokenize import word_tokenize
import re

from gutenbergpy import gutenbergcache

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

def clean_text(raw_bytes):
    text = raw_bytes.decode('utf-8', errors='ignore')
    text = re.sub(r'\r\n', ' ', text)
    start = text.find("*** START OF")
    end = text.find("*** END OF")
    if start != -1 and end != -1 and end > start:
        text = text[start:end]
    return text.strip()


def compute_ttr_series_cumulative(text):
    words = word_tokenize(text.lower())
    seen = set()
    ttr_list = []
    for i, word in enumerate(words):
        seen.add(word)
        ttr = len(seen) / (i + 1)
        ttr_list.append({"position": i + 1, "ttr": ttr})
    return ttr_list

def compute_ttr_series_rolling(text, window_size=200, step=50):
    words = word_tokenize(text.lower())
    ttr_list = []
    for i in range(0, len(words) - window_size + 1, step):
        window = words[i:i + window_size]
        ttr = len(set(window)) / len(window)
        ttr_list.append({"position": i, "ttr": ttr})
    return ttr_list
