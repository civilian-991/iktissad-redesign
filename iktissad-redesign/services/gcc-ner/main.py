"""
GCC newsroom — Arabic NER microservice (plan v4 Phase 3; research appendix §13).

Wraps CAMeL Tools' AraBERT NER. Heavy (torch + a BERT model), so it runs as a
long-lived service — the model loads ONCE at startup — and the Next.js app calls
it over HTTP (see src/lib/gcc/ner-client.ts). Never run CAMeL inside a serverless
function.

Entity types: ORG (issuer/company), PERS (executives/board), LOC, MISC.
Input must be word-tokenized first (we use simple_word_tokenize).

Run:
    pip install -r requirements.txt
    camel_data -i ner-arabert            # one-time model download
    uvicorn main:app --host 0.0.0.0 --port 8088
"""
from __future__ import annotations

from typing import List

from fastapi import FastAPI
from pydantic import BaseModel

# Imported lazily-at-import; the model is loaded once below.
from camel_tools.ner import NERecognizer
from camel_tools.tokenizers.word import simple_word_tokenize

app = FastAPI(title="gcc-ner", version="1.0.0")

# Load the AraBERT NER model once (CPU is fine).
_ner = NERecognizer.pretrained()


class NerRequest(BaseModel):
    text: str


class Span(BaseModel):
    text: str
    type: str  # ORG | PERS | LOC | MISC
    start: int  # word index
    end: int    # word index (inclusive)


class NerResponse(BaseModel):
    spans: List[Span]


def _stitch(words: List[str], labels: List[str]) -> List[Span]:
    """Merge BIO tags into entity spans."""
    spans: List[Span] = []
    cur_type: str | None = None
    cur_words: List[str] = []
    cur_start = 0
    for i, (w, lab) in enumerate(zip(words, labels)):
        if lab.startswith("B-"):
            if cur_type:
                spans.append(Span(text=" ".join(cur_words), type=cur_type, start=cur_start, end=i - 1))
            cur_type = lab[2:]
            cur_words = [w]
            cur_start = i
        elif lab.startswith("I-") and cur_type == lab[2:]:
            cur_words.append(w)
        else:  # 'O' or a mismatched I-
            if cur_type:
                spans.append(Span(text=" ".join(cur_words), type=cur_type, start=cur_start, end=i - 1))
            cur_type, cur_words = None, []
    if cur_type:
        spans.append(Span(text=" ".join(cur_words), type=cur_type, start=cur_start, end=len(words) - 1))
    return spans


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/ner", response_model=NerResponse)
def ner(req: NerRequest) -> NerResponse:
    words = simple_word_tokenize(req.text)
    if not words:
        return NerResponse(spans=[])
    labels = _ner.predict_sentence(words)
    return NerResponse(spans=_stitch(words, labels))
