# gcc-ner — Arabic NER microservice

Extracts entities (ORG = issuer, PERS = executives/board, LOC, MISC) from Arabic
disclosure text using CAMeL Tools' AraBERT NER. Runs as a long-lived service
because the model is heavy (torch + BERT) and must load once — never inside a
serverless function (research appendix §13).

## Run (Docker)
```bash
docker build -t gcc-ner services/gcc-ner
docker run -p 8088:8088 gcc-ner
```

## Run (local)
```bash
pip install -r requirements.txt
camel_data -i ner-arabert     # one-time model download (~500MB)
uvicorn main:app --port 8088
```

## API
`POST /ner  {"text": "..."}` → `{"spans": [{"text","type","start","end"}]}`
`GET /health` → `{"status":"ok"}`

## Wire it
Set `GCC_NER_URL=http://<host>:8088` in the Next.js app. Without it,
`src/lib/gcc/ner-client.ts` is a graceful no-op (returns `[]`), so entity
linking simply degrades rather than breaking the pipeline.
