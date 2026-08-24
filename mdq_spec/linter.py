"""
Lint checks for MDQ question documents that go beyond what JSON Schema
can express -- cross-field constraints, "not just whitespace" checks, and
the like.

These run on documents that have already been (or are being) validated
against their JSON Schema; the checks here are defensive about malformed
input (wrong types, missing fields) since that's the schema validator's
job to report, not the linter's.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Union

#: Verification levels. "strict" is accepted today but currently runs the
#: exact same checks as "default" -- it's a placeholder for additional,
#: stricter-than-usual constraints to be added later.
LEVELS = ("default", "strict")

# question-base.yaml fields that, per the base schema, are just `type:
# string` -- so an empty-but-technically-non-empty string like "   " (or
# even "" if minLength were ever dropped) passes JSON Schema but isn't a
# meaningful value.
_TEXT_FIELDS = ("preamble", "stem", "epilogue", "comment")
_CHOICE_QUESTION_TYPES = ("true-false", "multiple-choice", "multiple-selection")

__all__ = [
    "LintWarning",
    "lint_document",
]


@dataclass
class LintWarning:
    """A single warning produced by the linter.

    `path` mirrors the shape of a jsonschema ValidationError's `.path`:
    a tuple of keys/indices locating the offending value in the document.
    """

    rule: str
    message: str
    path: tuple[Union[str, int], ...] = field(default_factory=tuple)

    def __str__(self) -> str:
        location = "/".join(str(part) for part in self.path) or "<root>"
        return f"[{self.rule}] {location}: {self.message}"


def lint_document(
    document: dict[str, Any],
    question_type: str,
    level: str = "default",
) -> list[LintWarning]:
    """
    Run all applicable lint checks for a question document and return
    the list of warnings (empty if none).
    """
    if level not in LEVELS:
        raise ValueError(
            f"unknown verification level {level!r}; expected one of {LEVELS}"
        )

    warnings: list[LintWarning] = []

    warnings.extend(_check_text_fields_not_blank(document))

    if question_type in _CHOICE_QUESTION_TYPES:
        warnings.extend(_check_choices_unique(document))

    if question_type == "multiple-choice":
        warnings.extend(_check_multiple_choice_has_correct_choice(document))

    if level == "strict":
        # No strict-only rules defined yet -- this is where they'll go.
        pass

    return warnings


def _check_text_fields_not_blank(document: dict[str, Any]) -> list[LintWarning]:
    """epilogue, stem, preamble, comment: if defined, must have at least
    one visible (non-whitespace) character."""
    warnings = []
    for field_name in _TEXT_FIELDS:
        value = document.get(field_name)
        if value is None or not isinstance(value, str):
            # Missing is fine (they're optional, except stem which the
            # schema already requires); wrong type is the schema's job to
            # flag, not the linter's.
            continue
        if value.strip() == "":
            warnings.append(
                LintWarning(
                    rule="blank-text-field",
                    path=(field_name,),
                    message=f"'{field_name}' is defined but has no visible characters",
                )
            )
    return warnings


def _check_choices_unique(document: dict[str, Any]) -> list[LintWarning]:
    """true-false, multiple-choice, multiple-selection: choice ids and
    choice texts must each be unique within the question."""
    warnings: list[LintWarning] = []
    choices = document.get("choices")
    if not isinstance(choices, list):
        return warnings

    seen_ids: dict[str, int] = {}
    seen_texts: dict[str, int] = {}

    for index, choice in enumerate(choices):
        if not isinstance(choice, dict):
            continue

        choice_id = choice.get("id")
        if isinstance(choice_id, str):
            first_index = seen_ids.get(choice_id)
            if first_index is not None:
                warnings.append(
                    LintWarning(
                        rule="duplicate-choice-id",
                        path=("choices", index, "id"),
                        message=(
                            f"choice id {choice_id!r} is already used by "
                            f"choices[{first_index}]"
                        ),
                    )
                )
            else:
                seen_ids[choice_id] = index

        text = choice.get("text")
        if isinstance(text, str):
            first_index = seen_texts.get(text)
            if first_index is not None:
                warnings.append(
                    LintWarning(
                        rule="duplicate-choice-text",
                        path=("choices", index, "text"),
                        message=(
                            f"choice text {text!r} is already used by "
                            f"choices[{first_index}]"
                        ),
                    )
                )
            else:
                seen_texts[text] = index

    return warnings


def _check_multiple_choice_has_correct_choice(
    document: dict[str, Any],
) -> list[LintWarning]:
    """multiple-choice: at least one choice must have a score >= 1."""
    choices = document.get("choices")
    if not isinstance(choices, list):
        return []

    has_correct_choice = any(
        isinstance(choice, dict)
        and isinstance(choice.get("score"), (int, float))
        and not isinstance(choice.get("score"), bool)
        and choice.get("score", 0) >= 1
        for choice in choices
    )

    if has_correct_choice:
        return []

    return [
        LintWarning(
            rule="multiple-choice-no-correct-choice",
            path=("choices",),
            message="no choice has a score >= 1; the question has no correct answer",
        )
    ]
