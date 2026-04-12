---
paths:
  - "src/app/api/**/*.ts"
  - "src/lib/supabase/**/*.ts"
  - "supabase/migrations/**/*.sql"
  - "src/types/**/*.ts"
---

# RAG-FIRST — MANDATORY FOR EVERY FILE MATCHING THESE PATHS

You are about to write or modify a file that touches the database, API, or types.

**STOP. Before writing any code in this file:**

1. Call `mcp__knowledge-rag__search_knowledge` for every table this file queries
2. Call `mcp__knowledge-rag__search_knowledge` for every API endpoint this file calls or implements
3. Use the exact column names, types, and patterns from the search results
4. Do NOT guess column names — the RAG index has the authoritative schema

If you already called `search_knowledge` for these tables/endpoints earlier in this session, you may proceed. But if this is your first interaction with a table or endpoint, you MUST search first.

**Common mistakes to avoid:**
- Using grep/Read on migration files to find column names (use search_knowledge instead)
- Guessing column names based on conventions (search_knowledge has the real schema)
- Skipping the search because "I already know this table" (you might be wrong)
