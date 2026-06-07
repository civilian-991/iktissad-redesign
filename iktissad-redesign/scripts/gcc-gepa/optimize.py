#!/usr/bin/env python3
"""
GCC newsroom — offline drafting/classifier prompt optimization with DSPy + GEPA.

Design (research appendix §10 Hermes self-evolution; plan v4 §2.4):
  - The training signal is GROUND TRUTH from the editor decision log
    (gcc_editorial_decisions): approved-clean = 1.0, minor-edit = 0.6,
    rejected = 0.0, with an edit-distance penalty. This is the signal Hermes
    never had — use it instead of a keyword-overlap proxy.
  - The GEPA metric returns a SCORE *and* TEXTUAL FEEDBACK (the rejection/edit
    reason) so GEPA can do reflective mutation — its whole advantage.
  - Promotion is HUMAN-GATED: this script writes a candidate prompt + metrics to
    ./output and never deploys. A human reviews the diff and flips the
    production label (or updates the per-category template row) manually.

Run OFFLINE (cron/manual), never in the request path:
    pip install -r requirements.txt
    export AI_GATEWAY_API_KEY=...  SUPABASE_URL=...  SUPABASE_SERVICE_ROLE_KEY=...
    python optimize.py --category earnings --iterations 8
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
from dataclasses import dataclass

# These imports resolve only once `pip install -r requirements.txt` has run.
try:
    import dspy
    from supabase import create_client
except Exception as e:  # pragma: no cover - scaffold guard
    raise SystemExit(
        "Install deps first: pip install -r requirements.txt "
        f"(missing: {e})"
    )

OUTPUT = pathlib.Path(__file__).parent / "output"
MAX_GROWTH = 0.20  # candidate prompt may not exceed baseline by >20% (Hermes gate)


@dataclass
class Example:
    disclosure: str          # the source disclosure text
    approved_text: str       # editor-approved Arabic article (ground truth)
    action: str              # approved | edited | rejected
    edit_distance: int | None
    reason: str | None


def fetch_examples(category: str, limit: int = 500) -> list[Example]:
    """Pull labeled examples from the decision log joined to the draft + source."""
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    # Join decisions → generated_articles (draft) → story_budget → disclosure.
    rows = (
        sb.table("gcc_editorial_decisions")
        .select("action, reason, edit_diff, category, generated_article_id")
        .eq("category", category)
        .in_("action", ["approved", "edited", "rejected"])
        .limit(limit)
        .execute()
        .data
        or []
    )
    out: list[Example] = []
    for r in rows:
        gen_id = r.get("generated_article_id")
        if not gen_id:
            continue
        gen = (
            sb.table("gcc_generated_articles").select("draft, story_budget_id").eq("id", gen_id).single().execute().data
        )
        if not gen:
            continue
        draft = gen.get("draft") or {}
        # Resolve the source disclosure via the story budget assignment.
        budget = (
            sb.table("gcc_story_budget").select("assignment").eq("id", gen["story_budget_id"]).single().execute().data
            or {}
        )
        dis_id = (budget.get("assignment") or {}).get("disclosure_event_id")
        disclosure = ""
        if dis_id:
            d = sb.table("gcc_disclosure_events").select("body, title").eq("id", dis_id).single().execute().data or {}
            disclosure = d.get("body") or d.get("title") or ""
        edit = r.get("edit_diff") or {}
        approved_text = (edit.get("after") if isinstance(edit, dict) else None) or draft.get("body_md") or ""
        out.append(
            Example(
                disclosure=disclosure,
                approved_text=approved_text,
                action=r["action"],
                edit_distance=(edit.get("distance") if isinstance(edit, dict) else None),
                reason=r.get("reason"),
            )
        )
    return out


class DraftSignature(dspy.Signature):
    """اكتب مقالاً مالياً عربياً من الإفصاح، ملتزماً بقواعد التحرير."""
    skill_instructions: str = dspy.InputField()
    disclosure: str = dspy.InputField()
    article: str = dspy.OutputField()


class DraftModule(dspy.Module):
    def __init__(self, skill_text: str):
        super().__init__()
        self.skill_text = skill_text  # the thing GEPA mutates
        self.predict = dspy.ChainOfThought(DraftSignature)

    def forward(self, disclosure: str):
        return dspy.Prediction(
            article=self.predict(skill_instructions=self.skill_text, disclosure=disclosure).article
        )


def ground_truth_metric(example, prediction, trace=None):
    """Score from the editor decision + return textual feedback for GEPA."""
    action = getattr(example, "action", "approved")
    base = {"approved": 1.0, "edited": 0.6, "rejected": 0.0}.get(action, 0.5)
    # Edit-distance penalty (normalized) for 'edited' examples.
    if action == "edited" and getattr(example, "edit_distance", None):
        approved_len = max(len(getattr(example, "approved_text", "") or ""), 1)
        base = max(0.0, base - min(0.4, example.edit_distance / approved_len))
    feedback = example.reason or (
        "نُشر دون تعديل." if action == "approved" else
        "رُفض — راجع سبب الرفض." if action == "rejected" else "عُدّل — قرّب الأسلوب من النسخة المعتمدة."
    )
    # GEPA consumes both the float and the feedback string (the reflective signal).
    return dspy.Prediction(score=base, feedback=feedback) if hasattr(dspy, "Prediction") else base


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--category", required=True)
    ap.add_argument("--iterations", type=int, default=8)
    ap.add_argument("--baseline", help="path to the current prompt; defaults to a stub")
    args = ap.parse_args()

    OUTPUT.mkdir(exist_ok=True)
    examples = fetch_examples(args.category)
    if len(examples) < 10:
        raise SystemExit(f"Only {len(examples)} labeled examples for '{args.category}'. Collect more decisions first.")

    # 50/25/25 split (Hermes).
    n = len(examples)
    train, val, holdout = examples[: n // 2], examples[n // 2 : 3 * n // 4], examples[3 * n // 4 :]

    baseline_text = (
        pathlib.Path(args.baseline).read_text(encoding="utf-8")
        if args.baseline
        else "اكتب مقالاً مالياً عربياً دقيقاً من الإفصاح، بالعربية الفصحى وأرقام غربية، بنية الهرم المقلوب."
    )

    lm = dspy.LM(model=os.environ.get("GCC_MODEL_WRITER", "openai/gpt-5.4-pro"),
                 api_base="https://ai-gateway.vercel.sh/v1",
                 api_key=os.environ["AI_GATEWAY_API_KEY"])
    dspy.configure(lm=lm)

    baseline = DraftModule(baseline_text)
    trainset = [dspy.Example(disclosure=e.disclosure, action=e.action, approved_text=e.approved_text,
                             edit_distance=e.edit_distance, reason=e.reason).with_inputs("disclosure")
                for e in train]
    valset = [dspy.Example(disclosure=e.disclosure, action=e.action, approved_text=e.approved_text,
                           edit_distance=e.edit_distance, reason=e.reason).with_inputs("disclosure")
              for e in val]

    try:
        optimizer = dspy.GEPA(metric=ground_truth_metric, max_metric_calls=args.iterations * len(trainset))
    except Exception:
        optimizer = dspy.MIPROv2(metric=lambda ex, pr, trace=None: getattr(ground_truth_metric(ex, pr), "score", 0.5),
                                 auto="light")
    optimized = optimizer.compile(baseline, trainset=trainset, valset=valset)

    evolved_text = getattr(optimized, "skill_text", baseline_text)

    # Gate: size growth (Hermes ≤20%).
    if len(evolved_text) > len(baseline_text) * (1 + MAX_GROWTH):
        (OUTPUT / f"{args.category}_evolved_FAILED.md").write_text(evolved_text, encoding="utf-8")
        raise SystemExit("Candidate exceeds the +20% growth gate — rejected, not promoted.")

    # Emit candidate for HUMAN review (never auto-deploy).
    (OUTPUT / f"{args.category}_baseline.md").write_text(baseline_text, encoding="utf-8")
    (OUTPUT / f"{args.category}_candidate.md").write_text(evolved_text, encoding="utf-8")
    (OUTPUT / f"{args.category}_metrics.json").write_text(
        json.dumps({"category": args.category, "train": len(train), "val": len(val),
                    "holdout": len(holdout), "iterations": args.iterations}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Candidate written to {OUTPUT}/{args.category}_candidate.md — review the diff, then promote manually.")


if __name__ == "__main__":
    main()
