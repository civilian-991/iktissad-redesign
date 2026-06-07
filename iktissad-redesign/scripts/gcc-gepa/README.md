# GCC Newsroom — offline prompt optimization (DSPy + GEPA)

The **closed feedback loop** from plan v4 §2.4 (modeled on Hermes self-evolution,
research appendix §10). Turns the editor's approve/reject/**edit** decisions into
better drafting/classifier prompts — **offline, human-gated, never hot-swapped**.

## Why this exists
The live system already collects the corpus: every Telegram tap is logged to
`gcc_editorial_decisions` (via `POST /api/gcc/decision`), and `edit_diff` captures
the editor's corrections — the highest-signal training data. This job mines that
corpus and uses **GEPA's reflective optimization** (score **+ textual feedback**)
to evolve the per-category drafting prompt.

## How it works
1. Pull labeled examples for a category from the decision log (joined to the
   draft + source disclosure).
2. Wrap the current prompt as a `dspy.Module` (the prompt body is the optimizable
   parameter).
3. Run `dspy.GEPA` with a **ground-truth metric**: approved-clean = 1.0,
   minor-edit = 0.6 (− edit-distance penalty), rejected = 0.0 — returning the
   rejection/edit **reason as feedback** so GEPA mutates reflectively.
4. **Gate** the candidate (≤20% size growth; holdout split reserved for eval).
5. Write `output/<category>_candidate.md` + `_metrics.json` for **human review**.
   A human compares the diff and promotes by updating the per-category template
   (or, if using Langfuse Prompt Management, flipping the `production` label).

## Run it (offline only)
```bash
pip install -r requirements.txt
export AI_GATEWAY_API_KEY=...  SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
python optimize.py --category earnings --iterations 8
```
Needs ≥10 labeled decisions for the category (the script refuses otherwise —
collect more first). Cost ≈ a few dollars per run, no GPU.

## Guardrails (do not remove)
- **Never auto-deploys.** Output is a candidate file; promotion is a human step.
- **Benchmarks are gates, not fitness** — a candidate that regresses on the
  holdout must be rejected even if train score improved.
- Run on a schedule (e.g. weekly n8n cron) **only for categories whose reject
  rate exceeded a threshold** (see `/api/gcc/feedback/profile`).
