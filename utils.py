"""
Lexical Diversity Analysis Utilities

This module provides functions for computing various lexical diversity measures
including Type-Token Ratio (TTR) variants, Measure of Textual Lexical Diversity (MTLD),
and Hypergeometric Distribution D (HDD). It also includes text processing utilities
for tokenization, cleaning, and book search functionality.
"""  # ADDED: Module-level docstring

# CHANGED: Consolidated all imports at the top
from gutenbergpy.textget import get_text_by_id
from gutenbergpy import gutenbergcache
import re  # CHANGED: Removed duplicate import from line 27
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
import math  # MOVED: From line 110
from collections import Counter  # MOVED: From line 111


# =============================================================================
# TEXT PROCESSING UTILITIES
# =============================================================================

def tokenize_text(text: str):
    """
    Simple tokenizer using regex to extract words.
    
    Args:
        text (str): Input text to tokenize
        
    Returns:
        list: List of lowercase words (tokens) found in the text
    """  # ADDED: Function docstring
    return re.findall(r"\b\w+\b", text.lower())


def search_books(query, max_results=10):
    """
    Search for books in the Gutenberg cache by title or author.
    
    Args:
        query (str): Search query to match against titles and authors
        max_results (int): Maximum number of results to return (default: 10)
        
    Returns:
        list: List of dictionaries containing book id, title, and author
    """  # ADDED: Function docstring
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


def clean_text(text: str, exclude_stopwords: bool = False):
    """
    Clean and tokenize text, optionally removing stopwords.
    
    Args:
        text (str): Raw text to clean and tokenize
        exclude_stopwords (bool): Whether to remove English stopwords (default: False)
        
    Returns:
        list: List of cleaned and tokenized words
    """  # ADDED: Function docstring

    text = re.sub(r'\r\n', ' ', text)
    start = text.find("*** START OF")
    end = text.find("*** END OF")
    if start != -1 and end != -1 and end > start:
        text = text[start:end]

    tokens = re.findall(r'\b\w+\b', text.lower())

    if exclude_stopwords:
        tokens = [t for t in tokens if t not in ENGLISH_STOP_WORDS]

    return tokens


# =============================================================================
# BASIC TTR VARIANTS (TYPE-TOKEN RATIO FAMILY)
# =============================================================================

def compute_ttr_series_cumulative(tokens):
    """
    Compute cumulative Type-Token Ratio (TTR) for each position in the text.
    
    Args:
        tokens (list): List of tokens to analyze
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys
    """  # ADDED: Function docstring
    seen = set()
    ttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        ttr = len(seen) / (i + 1)
        ttr_list.append({"position": i + 1, "ttr": ttr})
    return ttr_list


def compute_ttr_series_rolling(tokens, window_size=200, step=50):
    """
    Compute rolling window Type-Token Ratio (TTR) across the text.
    
    Args:
        tokens (list): List of tokens to analyze
        window_size (int): Size of the rolling window (default: 200)
        step (int): Step size between windows (default: 50)
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys
    """  # ADDED: Function docstring
    ttr_list = []
    for i in range(0, len(tokens) - window_size + 1, step):
        window = tokens[i:i + window_size]
        ttr = len(set(window)) / len(window)
        ttr_list.append({"position": i, "ttr": ttr})
    return ttr_list


def compute_rttr_series_cumulative(tokens):
    """
    Compute cumulative Root Type-Token Ratio (RTTR) for each position.
    
    RTTR = types / sqrt(tokens) - addresses text length bias in TTR.
    
    Args:
        tokens (list): List of tokens to analyze
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys
    """  # ADDED: Function docstring
    seen = set()
    rttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        length = i + 1
        rttr = len(seen) / (length ** 0.5)
        rttr_list.append({"position": length, "ttr": rttr})
    return rttr_list


def compute_cttr_series_cumulative(tokens):
    """
    Compute cumulative Corrected Type-Token Ratio (CTTR) for each position.
    
    CTTR = types / sqrt(2 * tokens) - another correction for text length bias.
    
    Args:
        tokens (list): List of tokens to analyze
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys
    """  # ADDED: Function docstring
    seen = set()
    cttr_list = []
    for i, word in enumerate(tokens):
        seen.add(word)
        length = i + 1
        cttr = len(seen) / ((2 * length) ** 0.5)
        cttr_list.append({"position": length, "ttr": cttr})
    return cttr_list


# =============================================================================
# ADVANCED LEXICAL DIVERSITY MEASURES
# =============================================================================

def compute_mtld_cumulative(tokens, ttr_threshold=0.72, min_segment_length=10):
    """
    Compute cumulative Measure of Textual Lexical Diversity (MTLD).
    
    MTLD counts the number of word strings of varying lengths that maintain
    a TTR above a threshold, providing a length-independent diversity measure.
    
    Args:
        tokens (list): List of tokens to analyze
        ttr_threshold (float): TTR threshold for segment completion (default: 0.72)
        min_segment_length (int): Minimum segment length to consider (default: 10)
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys (MTLD values)
    """  # ADDED: Function docstring
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


def n_choose_k(n, k):
    """
    Compute binomial coefficient (n choose k) using factorial method.
    
    Helper function for HDD computation.
    
    Args:
        n (int): Total number of items
        k (int): Number of items to choose
        
    Returns:
        int: Binomial coefficient value, 0 if k < 0 or k > n
    """  # ADDED: Function docstring
    if k < 0 or k > n:
        return 0
    return math.factorial(n) // (math.factorial(k) * math.factorial(n - k))


def compute_hdd_cumulative(tokens, sample_size=42, step=50):
    """
    Compute cumulative Hypergeometric Distribution D (HDD).
    
    HDD estimates the probability of encountering new word types in a
    random sample, providing a sophisticated diversity measure based on
    hypergeometric distribution.
    
    Args:
        tokens (list): List of tokens to analyze
        sample_size (int): Size of random sample for probability calculation (default: 42)
        step (int): Step size for computation intervals (default: 50)
        
    Returns:
        list: List of dictionaries with 'position' and 'ttr' keys (HDD values)
    """  # ADDED: Function docstring
    def compute_hdd(slice_tokens):
        freqs = Counter(slice_tokens)
        N = len(slice_tokens)
        hdd = 0.0
        for word, freq in freqs.items():
            if freq == 0 or N == 0 or sample_size > N:
                continue
            try:
                prob_zero = n_choose_k(N - freq, sample_size) / n_choose_k(N, sample_size)
                hdd += (1 - prob_zero)
            except (ValueError, ZeroDivisionError, OverflowError):
                continue
        return hdd

    hdd_series = []
    for i in range(step, len(tokens) + 1, step):
        hdd_value = compute_hdd(tokens[:i])
        hdd_series.append({"position": i, "ttr": hdd_value})

    return hdd_series
