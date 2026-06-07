# GCC newsroom — Arabic NER microservice (CAMeL Tools AraBERT).
# Loads the model once at startup; the Next.js app calls /ner over HTTP.
FROM python:3.11-slim

WORKDIR /app

# System deps for camel-tools (kenlm build, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the NER model into the image so the container starts ready.
RUN camel_data -i ner-arabert

COPY main.py .

EXPOSE 8088
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8088"]
