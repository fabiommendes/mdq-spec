"""
Parse MDQ Markdown source and check it against the paired `.yaml` fixture
that documents the exact document a conforming parser must produce.

Coverage here is intentionally partial: the parser is basic and some
fixtures encode ids or fields that (as far as we can tell) no
deterministic rule can reproduce -- see the comments below and the
project report for specifics. `NOT_YET_SUPPORTED` documents precisely
which of the 38 valid pairs are expected to fail today, so the
parametrized test doubles as a progress log rather than silently
skipping unknown breakage.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from mdq.parser import parse_any, parse_file
from mdq.testing import VALID_SOURCES, parsed_sibling, relative_id
from mdq.validator import load_document, validate_document

#: Pairs the parser is known not to reproduce exactly, with the reason.
#: Keyed by the same id `relative_id` gives the pair (e.g.
#: "multiple-choice.composite-ids.mdq.md").
NOT_YET_SUPPORTED: dict[str, str] = {}


def parse_file_from_text(source: str) -> dict:
    """Parse an inline document, for cases with no example pair."""
    return parse_any(source)


def test_source_files_found() -> None:
    assert VALID_SOURCES, "no .mdq.md fixtures found"


def test_parses_minimal_essay() -> None:
    source = next(p for p in VALID_SOURCES if p.name == "no-title.mdq.md")
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_multiple_choice() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "multiple-choice" and p.name == "simple.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_multiple_selection() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "multiple-selection" and p.name == "simple.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_true_false() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "true-false" and p.name == "simple.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_short_answer() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "short-answer" and p.name == "simple.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_numeric() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "numeric" and p.name == "integer.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


def test_parses_minimal_fill_in() -> None:
    source = next(
        p
        for p in VALID_SOURCES
        if p.parent.name == "fill-in" and p.name == "capital.mdq.md"
    )
    assert parse_file(source) == load_document(parsed_sibling(source))


@pytest.mark.parametrize(
    "source", VALID_SOURCES, ids=[relative_id(p) for p in VALID_SOURCES]
)
def test_parses_matches_fixture(source: Path) -> None:
    key = relative_id(source)
    if key in NOT_YET_SUPPORTED:
        pytest.xfail(NOT_YET_SUPPORTED[key])
    assert parse_file(source) == load_document(parsed_sibling(source))


@pytest.mark.parametrize(
    "source", VALID_SOURCES, ids=[relative_id(p) for p in VALID_SOURCES]
)
def test_parsed_document_validates(source: Path) -> None:
    key = relative_id(source)
    if key in NOT_YET_SUPPORTED:
        pytest.xfail(NOT_YET_SUPPORTED[key])
    document = parse_file(source)
    result = validate_document(document)
    assert result.valid, [str(e) for e in result.errors]


# ---------------------------------------------------------------------
# regressions: syntax the docs describe but no example pair exercises
# ---------------------------------------------------------------------


@pytest.mark.parametrize("question_type", ["multiple-choice", "multiple-selection"])
def test_choice_instructor_comment_round_trips(question_type: str) -> None:
    """multiple-choice.md documents `!` lines as instructor comments on a
    choice; the parsed document must carry them AND still validate."""
    marker = "*" if question_type == "multiple-choice" else "x"
    source = (
        f"---\ntype: {question_type}\n---\n\n"
        "Which one is the largest river in the world?\n\n"
        f"* [{marker}] Amazon\n"
        "  ! Students often say the Nile; mention the 2007 survey.\n"
        "* [ ] Nile\n"
    )
    document = parse_file_from_text(source)
    assert document["choices"][0]["comment"] == (
        "Students often say the Nile; mention the 2007 survey."
    )
    assert validate_document(document).valid


def test_true_false_choice_instructor_comment_round_trips() -> None:
    """true-false.md says choices follow the multiple-choice structure, so
    `!` comments must work there too."""
    source = (
        "---\ntype: true-false\n---\n\n"
        "Judge the alternatives.\n\n"
        "* [T] The Amazon is the largest river by volume.\n"
        "  ! Worth contrasting with the Nile's length.\n"
        "* [F] The Earth is flat.\n"
    )
    document = parse_file_from_text(source)
    assert document["choices"][0]["comment"] == (
        "Worth contrasting with the Nile's length."
    )
    assert validate_document(document).valid


def test_numeric_blank_infers_domain_like_a_numeric_question() -> None:
    """fill-in.md grades a numeric blank exactly like a numeric question,
    so the domain is inferred from the representation in both."""
    source = (
        "---\ntype: fill-in\n---\n\n"
        "It weighs [^mass] kg and costs [^price] reais.\n\n"
        "[^mass/numeric]: 70\n\n"
        "[^price/numeric]: 12.50\n"
    )
    blanks = {b["id"]: b for b in parse_file_from_text(source)["blanks"]}
    assert blanks["mass"]["domain"] == "integer"
    assert blanks["price"]["domain"] == "decimal"
    assert blanks["price"]["decimalPlaces"] == 2
