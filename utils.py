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

def compute_mtld_cumulative(tokens, ttr_threshold=0.72, min_segment_length=10):
    factors = 0
    token_count = 0
    types = set()
    mtld_series = []

    for i, word in enumerate(tokens):
        token_count += 1
        types.add(word)
        ttr = len(types) / token_count

        if ttr <= ttr_threshold and token_count >= min_segment_length:
            factors += 1
            token_count = 0
            types.clear()

        current_factors = factors + (1 if token_count > 0 else 0)
        mtld_value = len(tokens) / current_factors if current_factors > 0 else 0
        mtld_series.append({"position": i + 1, "ttr": mtld_value})

    return mtld_series

    


import math
from collections import Counter

def compute_hdd_cumulative(tokens, sample_size=42, step=50):
    from collections import Counter
    import math

    def compute_hdd(subtokens):
        freqs = Counter(subtokens)
        N = len(subtokens)
        hdd = 0.0
        for word, freq in freqs.items():
            if freq == 0 or N == 0 or sample_size > N:
                continue
            try:
                prob_zero = math.comb(N - freq, sample_size) / math.comb(N, sample_size)
                hdd += (1 - prob_zero)
            except ValueError:
                continue
        return hdd

    hdd_series = []
    for i in range(step, len(tokens) + 1, step):
        subtokens = tokens[:i]
        hdd_value = compute_hdd(subtokens)
        hdd_series.append({"position": i, "ttr": hdd_value})

    return hdd_series

