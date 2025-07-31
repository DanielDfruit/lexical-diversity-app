from gutenbergpy.textget import get_text_by_id
from nltk.tokenize import word_tokenize
import re

def clean_text(raw_bytes):
    text = raw_bytes.decode('utf-8', errors='ignore')
    text = re.sub(r'\r\n', ' ', text)
    start = text.find("*** START OF")
    end = text.find("*** END OF")
    if start != -1 and end != -1:
        text = text[start:end]
    return text

def compute_ttr_series(text):
    words = word_tokenize(text.lower())
    seen = set()
    ttr_list = []
    for i, word in enumerate(words):
        seen.add(word)
        ttr = len(seen) / (i + 1)
        ttr_list.append({"position": i + 1, "ttr": ttr})
    return ttr_list
