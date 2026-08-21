"""Tests for the mdq_spec.linter checks -- the "beyond JSON Schema" rules
applied on top of schema validation (duplicate choice ids/texts, blank
text fields, multiple-choice needing a correct choice, ...).
"""

from __future__ import annotations

import pytest

from mdq_spec.linter import lint_document  # noqa: E402
from mdq_spec.validator import validate_document  # noqa: E402


def _rules(warnings) -> set[str]:
    return {w.rule for w in warnings}


# ---------------------------------------------------------------------
# blank-text-field: preamble, stem, epilogue, comment
# ---------------------------------------------------------------------


@pytest.mark.parametrize("field_name", ["preamble", "stem", "epilogue", "comment"])
def test_whitespace_only_text_field_warns(field_name: str) -> None:
    doc = {
        "type": "essay",
        "stem": "A perfectly fine stem.",
        "input": {"type": "text"},
        field_name: "   \n\t  ",
    }
    warnings = lint_document(doc, "essay")
    assert "blank-text-field" in _rules(warnings)
    matching = [w for w in warnings if w.rule == "blank-text-field"]
    assert matching[0].path == (field_name,)


def test_non_blank_text_fields_do_not_warn() -> None:
    doc = {
        "type": "essay",
        "stem": "Explain X.",
        "preamble": "Some context.",
        "epilogue": "Be concise.",
        "comment": "Internal note.",
        "input": {"type": "text"},
    }
    assert lint_document(doc, "essay") == []


def test_missing_text_fields_do_not_warn() -> None:
    doc = {"type": "essay", "stem": "Explain X.", "input": {"type": "text"}}
    assert lint_document(doc, "essay") == []


# ---------------------------------------------------------------------
# duplicate-choice-id / duplicate-choice-text
# ---------------------------------------------------------------------


@pytest.mark.parametrize(
    "question_type", ["true-false", "multiple-choice", "multiple-selection"]
)
def test_duplicate_choice_ids_and_texts_warn(question_type: str) -> None:
    doc = {
        "type": question_type,
        "stem": "x",
        "choices": [
            # score=1 on the first choice keeps multiple-choice's separate
            # "needs a correct choice" rule from also firing here, so this
            # test stays focused on the duplicate-id/text checks alone.
            {"id": "same-id", "text": "same text", "score": 1},
            {"id": "same-id", "text": "same text"},
        ],
    }
    warnings = lint_document(doc, question_type)
    assert {"duplicate-choice-id", "duplicate-choice-text"} <= _rules(warnings)
    assert "multiple-choice-no-correct-choice" not in _rules(warnings)
    # The second (duplicate) occurrence is the one flagged.
    for w in warnings:
        if w.rule in ("duplicate-choice-id", "duplicate-choice-text"):
            assert w.path[:2] == ("choices", 1)


def test_unique_choices_do_not_warn() -> None:
    doc = {
        "type": "multiple-choice",
        "stem": "x",
        "choices": [
            {"id": "a", "text": "A", "score": 1},
            {"id": "b", "text": "B"},
        ],
    }
    assert _rules(lint_document(doc, "multiple-choice")) == set()


def test_choices_without_id_are_not_flagged_as_duplicates() -> None:
    """Choice `id` is optional -- two choices both omitting it isn't a
    collision, and shouldn't be treated as one."""
    doc = {
        "type": "multiple-choice",
        "stem": "x",
        "choices": [
            {"text": "A", "score": 1},
            {"text": "B"},
        ],
    }
    assert _rules(lint_document(doc, "multiple-choice")) == set()


def test_choice_checks_do_not_apply_to_essay_or_numeric() -> None:
    essay_doc = {"type": "essay", "stem": "x", "input": {"type": "text"}}
    numeric_doc = {"type": "numeric", "stem": "x", "answer": 4}
    assert lint_document(essay_doc, "essay") == []
    assert lint_document(numeric_doc, "numeric") == []


# ---------------------------------------------------------------------
# multiple-choice-no-correct-choice
# ---------------------------------------------------------------------


def test_multiple_choice_without_any_correct_choice_warns() -> None:
    doc = {
        "type": "multiple-choice",
        "stem": "x",
        "choices": [{"id": "a", "text": "A", "score": 0}, {"id": "b", "text": "B"}],
    }
    warnings = lint_document(doc, "multiple-choice")
    assert "multiple-choice-no-correct-choice" in _rules(warnings)


def test_multiple_choice_with_a_correct_choice_does_not_warn() -> None:
    doc = {
        "type": "multiple-choice",
        "stem": "x",
        "choices": [{"id": "a", "text": "A", "score": 1}, {"id": "b", "text": "B"}],
    }
    warnings = lint_document(doc, "multiple-choice")
    assert "multiple-choice-no-correct-choice" not in _rules(warnings)


def test_only_multiple_choice_gets_the_correct_choice_check() -> None:
    """multiple-selection legitimately can have every choice be
    incorrect (e.g. 'select all prime numbers' with none listed), so it
    must NOT get the multiple-choice-only rule."""
    doc = {
        "type": "multiple-selection",
        "stem": "x",
        "choices": [{"id": "a", "text": "A"}, {"id": "b", "text": "B"}],
    }
    assert "multiple-choice-no-correct-choice" not in _rules(
        lint_document(doc, "multiple-selection")
    )


# ---------------------------------------------------------------------
# levels
# ---------------------------------------------------------------------


def test_unknown_level_raises() -> None:
    doc = {"type": "essay", "stem": "x", "input": {"type": "text"}}
    with pytest.raises(ValueError):
        lint_document(doc, "essay", level="nonsense")


def test_strict_level_runs_without_error() -> None:
    """No strict-only rules exist yet; 'strict' should still be a valid,
    accepted level rather than erroring out."""
    doc = {"type": "essay", "stem": "x", "input": {"type": "text"}}
    assert lint_document(doc, "essay", level="strict") == []


# ---------------------------------------------------------------------
# integration: warnings surface through validate_document without
# affecting `valid`
# ---------------------------------------------------------------------


def test_validate_document_reports_warnings_without_failing() -> None:
    doc = {
        "type": "multiple-choice",
        "stem": "x",
        "choices": [
            {"id": "a", "text": "A", "score": 0},
            {"id": "b", "text": "B", "score": 0},
        ],
    }
    result = validate_document(doc)
    assert result.valid is True
    assert result.errors == []
    assert "multiple-choice-no-correct-choice" in _rules(result.warnings)


def test_validate_document_rejects_unknown_level() -> None:
    doc = {"type": "essay", "stem": "x", "input": {"type": "text"}}
    with pytest.raises(ValueError):
        validate_document(doc, level="nonsense")
