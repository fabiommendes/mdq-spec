"""
Short-answer accept/reject migration: the pattern mini-language,
`mdq.models.normalize_text`, `ShortAnswerQuestion.score_response` /
`effective_accept`, legacy `one_of`/`regex` desugaring, and the
`[short-answer/accept]` / `[short-answer/reject]` parser support.

Written against `docs/question-types/short-answer.md` and the interface
contract pinned for this migration -- not against the implementation, which
is being written in parallel from the same documents. Failures here are
expected until that work lands; `tests/test_scoring.py`'s pre-existing
short-answer tests cover the legacy `oneOf`/`regex` fields.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from mdq import models
from mdq.errors import NotAutoGradable, ParseError
from mdq.parser import parse_any, parse_file
from mdq.regex import RegexPattern
from mdq.testing import VALID_SOURCES, parsed_sibling, relative_id
from mdq.validator import load_document


def _parse(source: str) -> dict:
    """Parse an inline MDQ document, mirroring `tests/test_parser.py`."""
    return parse_any(source)


#
# Pattern mini-language
#
@pytest.mark.parametrize("pattern", ["*", " * ", "\t*\n"], ids=["bare", "padded", "tab-newline"])
def test_wildcard_matches_every_response_after_stripping(pattern: str) -> None:
    question = models.ShortAnswerQuestion(stem="x", accept=[pattern])
    assert question.score_response("anything at all").score == 1.0
    assert question.score_response("").score == 1.0


def test_missing_delimiters_makes_a_regex_shaped_string_a_literal() -> None:
    """No leading '/' means no regex semantics, even though the pattern
    looks like a character class."""
    question = models.ShortAnswerQuestion(
        stem="What is the capital of Brazil?", accept=["[Bb]rasilia"]
    )
    assert question.score_response("[Bb]rasilia").score == 1.0
    assert question.score_response("Brasília").score == 0.0
    assert question.score_response("brasilia").score == 0.0


def test_a_literal_containing_a_slash_is_not_mistaken_for_a_regex() -> None:
    """`math/floor` does not *start* with '/', so it stays a literal even
    though it contains one -- naively splitting on '/' would misclassify
    it as an unterminated regex."""
    question = models.ShortAnswerQuestion(
        stem="Which module and function floor a number down in Python?",
        accept=["math/floor"],
    )
    assert question.score_response("math/floor").score == 1.0
    assert question.score_response("MATH/FLOOR").score == 1.0


@pytest.mark.parametrize(
    "pattern", ["", "   ", "\t\n"], ids=["empty", "spaces", "tab-newline"]
)
def test_empty_or_whitespace_only_pattern_is_an_error(pattern: str) -> None:
    with pytest.raises(ValueError):
        models.AnswerPattern(pattern=pattern)


#
# Normalization
#
@pytest.mark.parametrize(
    "value",
    ["Brasília", "BRASILIA", "  brasilia  ", "brasília", "BrasÍlia"],
    ids=["accented-title", "ascii-upper", "padded-lower", "accented-lower", "mixed-accented"],
)
def test_normalize_text_folds_case_strips_accents_and_trims(value: str) -> None:
    assert models.normalize_text(value) == "brasilia"


def test_normalize_text_collapses_internal_whitespace() -> None:
    assert models.normalize_text("Rio   de\tJaneiro\n") == "rio de janeiro"


def test_bare_literal_accepts_a_differently_cased_unaccented_response() -> None:
    question = models.ShortAnswerQuestion(
        stem="What is the capital of Brazil?", accept=["Brasília"]
    )
    assert question.score_response("brasilia").score == 1.0


#
# Exact comparison
#
def test_exact_strips_only_surrounding_whitespace() -> None:
    question = models.ShortAnswerQuestion(
        stem="Which function checks for NaN in Python?",
        accept=["`math.isnan`"],
    )
    assert question.score_response("  math.isnan  ").score == 1.0
    assert question.score_response("Math.IsNaN").score == 0.0
    assert question.score_response("math.isnan()").score == 0.0


def test_a_single_question_mixes_exact_and_inexact_patterns() -> None:
    """A question could not do this before: `exact` was a question-wide
    switch, so mixing a case-sensitive literal with a normalized one
    required two questions."""
    question = models.ShortAnswerQuestion(
        stem="Which Python function checks for NaN?",
        accept=["`math.isnan`", "not a number"],
    )
    assert question.score_response("math.isnan").score == 1.0
    assert question.score_response("Math.isnan").score == 0.0
    assert question.score_response("NOT A NUMBER").score == 1.0


#
# Regex patterns match the raw response
#
def test_regex_pattern_sanity_check_against_mdq_regex() -> None:
    """mdq.regex is already implemented and tested; confirm the fixture
    assumption before relying on it through ShortAnswerQuestion."""
    pattern = RegexPattern("/[A-Z]{3}/")
    assert pattern.match("GRU")
    assert not pattern.match("gru")


def test_case_sensitive_regex_rejects_lowercase_in_an_inexact_question() -> None:
    """Normalization must not leak into regex matching -- the response is
    compared raw, so a case-sensitive regex stays possible even though the
    question itself is not `exact`."""
    question = models.ShortAnswerQuestion(
        stem="Give the IATA airport code for São Paulo–Guarulhos.",
        accept=["/[A-Z]{3}/"],
    )
    assert question.score_response("GRU").score == 1.0
    assert question.score_response("gru").score == 0.0


#
# Grading: accept decides, reject never changes the score
#
def test_score_is_binary() -> None:
    question = models.ShortAnswerQuestion(stem="Name a Brazilian biome.", accept=["cerrado"])
    assert question.score_response("cerrado").score == 1.0
    assert question.score_response("amazonia").score == 0.0


def test_accept_wins_over_reject_on_a_tie() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", accept=["cerrado"], reject=["cerrado"]
    )
    assert question.score_response("cerrado").score == 1.0


def test_reject_never_lowers_a_score_accept_already_gave() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", accept=["*"], reject=["cerrado"]
    )
    assert question.score_response("cerrado").score == 1.0


#
# Feedback selection
#
def test_feedback_uses_first_accept_pattern_that_defines_feedback() -> None:
    """The wildcard matches first but carries no feedback, so the message
    must come from the next matching pattern that does define one --
    "first that matches" is not enough, it must also define feedback."""
    question = models.ShortAnswerQuestion(
        stem="Name the savanna biome of central Brazil.",
        accept=[
            models.AnswerPattern(pattern="*"),
            models.AnswerPattern(pattern="cerrado", feedback="Correct!"),
        ],
    )
    result = question.score_response("cerrado")
    assert result.score == 1.0
    assert result.feedback == ["Correct!"]


def test_feedback_falls_back_to_the_trailing_wildcard_reject_item() -> None:
    question = models.ShortAnswerQuestion(
        stem="What is the capital of Brazil?",
        accept=["Brasília"],
        reject=[
            models.AnswerPattern(
                pattern="Buenos Aires", feedback="That is Argentina's capital."
            ),
            models.AnswerPattern(pattern="*", feedback="Sorry, that is not correct."),
        ],
    )
    result = question.score_response("Rio de Janeiro")
    assert result.score == 0.0
    assert result.feedback == ["Sorry, that is not correct."]


def test_feedback_is_empty_when_no_matching_pattern_defines_one() -> None:
    question = models.ShortAnswerQuestion(
        stem="What is the capital of Brazil?",
        accept=["Brasília"],
        reject=[models.AnswerPattern(pattern="*")],
    )
    result = question.score_response("Rio de Janeiro")
    assert result.score == 0.0
    assert result.feedback == []


def test_correct_response_draws_feedback_only_from_accept() -> None:
    """A response matching both lists is correct and uses accept's
    feedback, even though a reject pattern with feedback also matched."""
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.",
        accept=[models.AnswerPattern(pattern="cerrado", feedback="Well done!")],
        reject=[models.AnswerPattern(pattern="cerrado", feedback="Should never show.")],
    )
    result = question.score_response("cerrado")
    assert result.feedback == ["Well done!"]


#
# NotAutoGradable
#
def test_open_ended_short_answer_is_not_auto_gradable() -> None:
    question = models.ShortAnswerQuestion(
        stem="Describe the geography of the Pantanal.", open_ended=True
    )
    with pytest.raises(NotAutoGradable):
        question.score_response("It is a vast tropical wetland.")


def test_short_answer_without_any_answer_key_is_not_auto_gradable() -> None:
    question = models.ShortAnswerQuestion(stem="Describe the Pantanal.")
    with pytest.raises(NotAutoGradable):
        question.score_response("A vast tropical wetland.")


def test_reject_only_question_is_not_auto_gradable() -> None:
    """A `reject` list can never mark anything correct, so carrying only
    one does not give the question an effective accept list."""
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", reject=["Sahara desert"]
    )
    with pytest.raises(NotAutoGradable):
        question.score_response("cerrado")


#
# Legacy desugaring
#
def test_effective_accept_desugars_one_of() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a primary colour.", one_of=["red", "green", "blue"]
    )
    assert [p.pattern for p in question.effective_accept()] == ["red", "green", "blue"]
    assert question.score_response("Green").score == 1.0


def test_effective_accept_desugars_regex_without_i_flag() -> None:
    """The legacy `regex` field desugars case-sensitive, unlike the old
    behaviour that carried an implicit `i` flag for inexact questions."""
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", regex="cerrado|amazonia"
    )
    assert [p.pattern for p in question.effective_accept()] == ["/cerrado|amazonia/"]
    assert question.score_response("cerrado").score == 1.0
    assert question.score_response("Cerrado").score == 0.0


def test_regex_wins_over_one_of_when_both_are_set() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", one_of=["amazonia"], regex="cerrado"
    )
    assert [p.pattern for p in question.effective_accept()] == ["/cerrado/"]
    assert question.score_response("amazonia").score == 0.0
    assert question.score_response("cerrado").score == 1.0


def test_explicit_accept_wins_over_legacy_fields() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.", one_of=["amazonia"], accept=["cerrado"]
    )
    assert [p.pattern for p in question.effective_accept()] == ["cerrado"]
    assert question.score_response("amazonia").score == 0.0
    assert question.score_response("cerrado").score == 1.0


#
# preAccept/preReject are inert for grading
#
def test_pre_reject_match_does_not_lower_the_score() -> None:
    question = models.ShortAnswerQuestion(
        stem="In which year did Brazil declare independence from Portugal?",
        accept=["1822"],
        pre_reject=["/1822/"],
    )
    assert question.score_response("1822").score == 1.0


def test_pre_accept_and_pre_reject_fields_load_without_affecting_grading() -> None:
    question = models.ShortAnswerQuestion(
        stem="Name a Brazilian biome.",
        accept=["cerrado"],
        pre_accept=["/./f"],
        pre_reject=["/xyz/"],
    )
    assert question.pre_accept is not None
    assert question.pre_reject is not None
    assert question.score_response("cerrado").score == 1.0
    assert question.score_response("xyz").score == 0.0


#
# Parser: [short-answer/accept] and [short-answer/reject] blocks
#
_ACCEPT_REJECT_SOURCE = (
    "---\ntype: short-answer\n---\n\n"
    "What is the capital of Brazil?\n\n"
    "[short-answer/accept]:\n"
    "* /[Bb]ras[íi]lia/i\n"
    "  > Good call!\n\n"
    "[short-answer/reject]:\n"
    "* Buenos Aires\n"
    "  > That is Argentina's capital.\n"
    "  ! Bare strings are normalized.\n"
    "* *\n"
    "  > Sorry, that is not correct.\n"
)


def test_accept_and_reject_blocks_produce_pattern_arrays() -> None:
    document = _parse(_ACCEPT_REJECT_SOURCE)
    assert document["accept"] == [
        {"pattern": "/[Bb]ras[íi]lia/i", "feedback": "Good call!"}
    ]
    assert document["reject"] == [
        {
            "pattern": "Buenos Aires",
            "feedback": "That is Argentina's capital.",
            "comment": "Bare strings are normalized.",
        },
        {"pattern": "*", "feedback": "Sorry, that is not correct."},
    ]


def test_pattern_without_feedback_or_comment_is_a_bare_string() -> None:
    source = (
        "---\ntype: short-answer\n---\n\n"
        "Name a Brazilian biome.\n\n"
        "[short-answer/accept]:\n"
        "* cerrado\n"
        "* /amazonia/i\n"
        "  > Also correct!\n"
    )
    document = _parse(source)
    assert document["accept"] == [
        "cerrado",
        {"pattern": "/amazonia/i", "feedback": "Also correct!"},
    ]


@pytest.mark.parametrize("order", ["accept-first", "reject-first"])
def test_accept_and_reject_blocks_may_appear_in_either_order(order: str) -> None:
    accept_block = "[short-answer/accept]:\n* Brasília\n\n"
    reject_block = "[short-answer/reject]:\n* Rio de Janeiro\n\n"
    body = (
        accept_block + reject_block if order == "accept-first" else reject_block + accept_block
    )
    source = "---\ntype: short-answer\n---\n\nWhat is the capital of Brazil?\n\n" + body
    document = _parse(source)
    assert document["accept"] == ["Brasília"]
    assert document["reject"] == ["Rio de Janeiro"]


def test_backtick_content_becomes_an_exact_one_of_entry() -> None:
    source = (
        "---\ntype: short-answer\n---\n\n"
        "Which function checks for NaN in Python?\n\n"
        "[short-answer]: `math.isnan`\n"
    )
    document = _parse(source)
    assert document["oneOf"] == ["`math.isnan`"]
    assert "exact" not in document


def test_repeated_accept_block_is_a_parse_error() -> None:
    source = (
        "---\ntype: short-answer\n---\n\n"
        "Name a Brazilian biome.\n\n"
        "[short-answer/accept]:\n* cerrado\n\n"
        "[short-answer/accept]:\n* amazonia\n"
    )
    with pytest.raises(ParseError):
        _parse(source)


def test_combining_two_plain_blocks_is_a_parse_error() -> None:
    """A question defines at most one `[short-answer]` block -- exactness
    is now a property of each pattern, not a second block to declare."""
    source = (
        "---\ntype: short-answer\n---\n\n"
        "What is the capital of Brazil?\n\n"
        "[short-answer]: Brasília\n\n"
        "[short-answer]: `Brasília`\n"
    )
    with pytest.raises(ParseError):
        _parse(source)


#
# Fixture round-trip
#
_NEW_FIXTURE_NAMES = frozenset(
    {
        "accept-reject.mdq.md",
        "accept-regex-flags.mdq.md",
        "exact-block.mdq.md",
        "pre-validation.mdq.md",
    }
)

_NEW_FIXTURES = [
    source
    for source in VALID_SOURCES
    if source.parent.name == "short-answer" and source.name in _NEW_FIXTURE_NAMES
]


def test_new_fixtures_are_present() -> None:
    """Guard against a rename making the parametrized test below a no-op."""
    assert {source.name for source in _NEW_FIXTURES} == _NEW_FIXTURE_NAMES


@pytest.mark.parametrize(
    "source", _NEW_FIXTURES, ids=[relative_id(p) for p in _NEW_FIXTURES]
)
def test_new_short_answer_fixture_round_trips(source: Path) -> None:
    got = parse_file(source)
    expected = load_document(parsed_sibling(source))
    assert got == expected
