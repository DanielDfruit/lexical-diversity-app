# Lexical Diversity API

This FastAPI backend computes the Token Type Ratio (TTR) for books from Project Gutenberg.

## Endpoints

- `/ttr?book_id=2701` – Computes TTR curve for Moby Dick (book ID 2701)

## Running Locally

```bash
pip install -r requirements.txt
uvicorn main:app --reload
