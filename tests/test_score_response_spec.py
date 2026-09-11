"""
Cross-checks `Model.score_response()` against the literal wording of
docs/question-types/{multiple-choice,multiple-selection,fill-in,true-false}.md,
independent of what `tests/test_scoring.py` already documents about the
current implementation. Where a test here fails, the implementation
disagrees with the prose spec -- see the docstring of each failing test
for the exact quote it is checking.

Fill-in is not covered here: it already matches its `#grading` section --
partial/all-or-nothing/symmetric all divide by the total blank count, and
an unanswered blank is neutral under symmetric.
"""

from __future__ import annotations

import pytest

from mdq import models


#
# Multiple choice
#
# docs/question-types/multiple-choice.md#grading, verbatim:
#
#   The grading strategy is ignored if the marked choice defines a score,
#   and the question is graded according to that score. Otherwise, it uses
#   the following rules:
#   * partial: Non specified scores are treated as 0.
#   * all-or-nothing: Non specified scores are treated as 0.
#   * symmetric: Non specified scores are computed in such a way that the
#     average score of randomly picking choices is zero. [...] Default is
#     "symmetric".
#
# `docs/question-types/multiple-choice.md#frontmatter` also lists `grading`
# as a valid field, on par with multiple-selection/true-false/fill-in.
def test_multiple_choice_accepts_a_grading_field() -> None:
    """Per docs/question-types/multiple-choice.md#frontmatter, `grading` is
    a documented multiple-choice field, on par with the other types that
    declare one.
    """
    question = models.MultipleChoiceQuestion(
        stem="What is the capital of Brazil?",
        grading="partial",
        choices=[
            models.ScoredChoice(id="brasilia", text="Brasília", score=1.0),
            models.ScoredChoice(id="rio", text="Rio de Janeiro"),
        ],
    )
    assert question.grading == "partial"


def test_multiple_choice_symmetric_default_backfills_unspecified_scores() -> None:
    """Default grading is "symmetric": non-specified (blank `[ ]`) choices
    must be scored so the *average* over all choices is zero. With one
    choice explicitly `score=1.0` and three left blank, the three blanks
    must share -1.0 evenly: -1/3 each.

    The implementation has no fallback at all -- an unspecified `score` is
    `None`, and `score_response` reduces that straight to 0.0 via
    `choice.score or 0.0`, regardless of grading strategy.
    """
    question = models.MultipleChoiceQuestion(
        stem="What is the capital of Brazil?",
        choices=[
            models.ScoredChoice(id="brasilia", text="Brasília", score=1.0),
            models.ScoredChoice(id="rio", text="Rio de Janeiro"),
            models.ScoredChoice(id="salvador", text="Salvador"),
            models.ScoredChoice(id="belem", text="Belém"),
        ],
    )
    result = question.score_response("rio")
    assert result.score == pytest.approx(-1 / 3)


#
# True false
#
# docs/question-types/true-false.md#grading, verbatim:
#
#   partial: Each correct marking gives a point, and each incorrect or
#   missing marking is ignored. The total is normalized to the range
#   [0, 1] by dividing by the total number of choices.
#
#   all-or-nothing: The student must mark all choices with the correct
#   marking. Any mistake gives zero points. The total is zero if there is
#   any incorrect marking, otherwise it is the number of correct markings
#   divided by the total number of choices. It can be smaller than 1 if the
#   student abstained from marking some choices.
#
#   symmetric: Each correctly marked choice gives a point, and each
#   incorrectly marked choice subtracts a point. The total is normalized to
#   the range [-1, 1] by dividing by the total number of choices. Choices
#   left unmarked neither add nor subtract points.
#
# The doc backs this with a worked table for the answer key [T, F, T, F]:
#
#   | Markings       | "partial" | "all-or-nothing" | "symmetric" |
#   | -------------- | :-------: | :--------------: | :---------: |
#   | [T, F, T, F]   |    1.0    |       1.0        |     1.0     |
#   | [F, T, F, T]   |    0.0    |       0.0        |    -1.0     |
#   | [T, T, F, F]   |    0.5    |       0.0        |     0.0     |
#   | [T, F, _, _]   |    0.5    |       0.5        |     0.5     |
#   | [F, T, _, _]   |    0.0    |       0.0        |    -0.5     |
#   | [_, _, _, _]   |    0.0    |       0.0        |     0.0     |
#
# reproduced verbatim below against all three grading strategies.
def _tf_question(grading: models.GradingStrategy) -> models.TrueFalseQuestion:
    return models.TrueFalseQuestion(
        stem="Judge the alternatives.",
        grading=grading,
        choices=[
            models.Statement(id="s1", text="Statement 1", correct=True),
            models.Statement(id="s2", text="Statement 2", correct=False),
            models.Statement(id="s3", text="Statement 3", correct=True),
            models.Statement(id="s4", text="Statement 4", correct=False),
        ],
    )


_TF_TABLE: list[tuple[str, dict[str, bool | None], float, float, float]] = [
    # markings              partial  all-or-nothing  symmetric
    ("[T, F, T, F]", {"s1": True, "s2": False, "s3": True, "s4": False}, 1.0, 1.0, 1.0),
    (
        "[F, T, F, T]",
        {"s1": False, "s2": True, "s3": False, "s4": True},
        0.0,
        0.0,
        -1.0,
    ),
    ("[T, T, F, F]", {"s1": True, "s2": True, "s3": False, "s4": False}, 0.5, 0.0, 0.0),
    ("[T, F, _, _]", {"s1": True, "s2": False}, 0.5, 0.5, 0.5),
    ("[F, T, _, _]", {"s1": False, "s2": True}, 0.0, 0.0, -0.5),
    ("[_, _, _, _]", {}, 0.0, 0.0, 0.0),
]


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _TF_TABLE],
    ids=[row[0] for row in _TF_TABLE],
)
def test_true_false_partial_matches_the_documented_table(
    markings: dict[str, bool | None],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    result = _tf_question("partial").score_response(markings)
    assert result.score == pytest.approx(partial)


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _TF_TABLE],
    ids=[row[0] for row in _TF_TABLE],
)
def test_true_false_symmetric_matches_the_documented_table(
    markings: dict[str, bool | None],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    result = _tf_question("symmetric").score_response(markings)
    assert result.score == pytest.approx(symmetric)


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _TF_TABLE],
    ids=[row[0] for row in _TF_TABLE],
)
def test_true_false_all_or_nothing_matches_the_documented_table(
    markings: dict[str, bool | None],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    """`[T, F, _, _]` has no incorrect marking, only two correct markings
    and two abstentions, so the doc awards partial credit -- 2/4 = 0.5,
    the same number `"partial"` gets for that row.
    """
    result = _tf_question("all-or-nothing").score_response(markings)
    assert result.score == pytest.approx(all_or_nothing)


#
# Multiple selection
#
# docs/question-types/multiple-selection.md#grading, verbatim:
#
#   partial: Each correct choice ticked gives a point, and each incorrect
#   choice ticked subtracts a point. The total is normalized to the range
#   [0, 1] by dividing by the total number of choices.
#
#   all-or-nothing: The student must tick all correct choices and leave
#   all incorrect choices unticked to get a point. Any mistake gives zero
#   points.
#
#   symmetric: Each correct choice ticked gives a point, and each
#   incorrect choice ticked subtracts a point. The total is normalized to
#   the range [0, 1].
#
# The doc backs this with the same-shaped worked table as true-false, for
# the answer key [T, F, T, F] (T = should be ticked):
#
#   | Markings       | "partial" | "all-or-nothing" | "symmetric" |
#   | -------------- | :-------: | :--------------: | :---------: |
#   | [T, F, T, F]   |    1.0    |       1.0        |     1.0     |
#   | [F, T, F, T]   |    0.0    |       0.0        |    -1.0     |
#   | [T, T, F, F]   |    0.5    |       0.0        |     0.0     |
#   | [T, F, _, _]   |   0.75    |       0.0        |     0.5     |
#   | [F, T, _, _]   |    0.0    |       0.0        |    -0.75    |
#   | [_, _, _, _]   |    0.5    |       0.0        |     0.0     |
#
# Only rows 1, 2, 3, 4 and 6 fit a single formula: "partial" is the
# correctly-judged fraction `judged_correctly / n` (never negative, so it
# needs no floor); "symmetric" is `(2 * judged_correctly - n) / n`, the
# same computation `score_response` already used pre-`set[str]`; and
# "all-or-nothing" is unchanged (`judged_correctly == n`). Row 5, `[F, T,
# _, _]`, is off by exactly 1/4 on *both* of its non-zero cells --
# 0.0 instead of 0.25 for "partial", -0.75 instead of -0.5 for
# "symmetric" -- which is the signature of one arithmetic slip in that
# row of the doc, not a different formula. `_MS_TABLE` below encodes the
# other five rows verbatim and carries the row-5 values the formula
# above actually produces, flagged inline; worth a doc fix.
def _ms_question(grading: models.GradingStrategy) -> models.MultipleSelectionQuestion:
    return models.MultipleSelectionQuestion(
        stem="Which of these should be selected?",
        grading=grading,
        choices=[
            models.BooleanChoice(id="s1", text="Choice 1", correct=True),
            models.BooleanChoice(id="s2", text="Choice 2", correct=False),
            models.BooleanChoice(id="s3", text="Choice 3", correct=True),
            models.BooleanChoice(id="s4", text="Choice 4", correct=False),
        ],
    )


_MS_TABLE: list[tuple[str, set[str], float, float, float]] = [
    # markings              partial  all-or-nothing  symmetric
    ("[T, F, T, F]", {"s1", "s3"}, 1.0, 1.0, 1.0),
    ("[F, T, F, T]", {"s2", "s4"}, 0.0, 0.0, -1.0),
    ("[T, T, F, F]", {"s1", "s2"}, 0.5, 0.0, 0.0),
    ("[T, F, _, _]", {"s1"}, 0.75, 0.0, 0.5),
    # doc says 0.0 / -0.75; 0.25 / -0.5 is what the shared formula gives
    # for every other row, off by exactly 1/n -- see note above.
    ("[F, T, _, _]", {"s2"}, 0.25, 0.0, -0.5),
    ("[_, _, _, _]", set(), 0.5, 0.0, 0.0),
]


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _MS_TABLE],
    ids=[row[0] for row in _MS_TABLE],
)
def test_multiple_selection_partial_matches_the_documented_table(
    markings: set[str],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    result = _ms_question("partial").score_response(markings)
    assert result.score == pytest.approx(partial)


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _MS_TABLE],
    ids=[row[0] for row in _MS_TABLE],
)
def test_multiple_selection_symmetric_matches_the_documented_table(
    markings: set[str],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    result = _ms_question("symmetric").score_response(markings)
    assert result.score == pytest.approx(symmetric)


@pytest.mark.parametrize(
    "markings, partial, all_or_nothing, symmetric",
    [row[1:] for row in _MS_TABLE],
    ids=[row[0] for row in _MS_TABLE],
)
def test_multiple_selection_all_or_nothing_matches_the_documented_table(
    markings: set[str],
    partial: float,
    all_or_nothing: float,
    symmetric: float,
) -> None:
    result = _ms_question("all-or-nothing").score_response(markings)
    assert result.score == pytest.approx(all_or_nothing)


@pytest.mark.parametrize(
    ("scores", "expected"),
    [
        ([1.0, None, None, None], -1 / 3),
        ([1.0, 1.0, None, None], -1.0),
        ([1.0, 0.5, None, None], -0.75),
        ([1.0, 1.0, 1.0, None], -1.0),
        ([1.0, -1.0, None, None], 0.0),
        ([1.0, -1.0, -1.0, None], 0.0),
    ],
)
def test_symmetric_spreads_declared_scores_over_the_undeclared_ones(
    scores: list[float | None], expected: float
) -> None:
    # Every row of the table in docs/question-types/multiple-choice.md, so
    # that picking at random averages zero. The last two clamp to [-1, 0].
    question = models.MultipleChoiceQuestion(
        stem="What is the capital of Brazil?",
        choices=[
            models.ScoredChoice(id=f"c{i}", text=f"Choice {i}", score=score)
            for i, score in enumerate(scores)
        ],
    )
    assert question.unspecified_score() == pytest.approx(expected)
    assert question.score_response("c3").score == pytest.approx(expected)


@pytest.mark.parametrize("grading", ["partial", "all-or-nothing"])
def test_non_symmetric_grading_treats_undeclared_scores_as_zero(grading: str) -> None:
    question = models.MultipleChoiceQuestion(
        stem="Which river is the longest in Brazil?",
        grading=grading,
        choices=[
            models.ScoredChoice(id="amazon", text="Amazon", score=1.0),
            models.ScoredChoice(id="parana", text="Parana"),
        ],
    )
    assert question.score_response("parana").score == 0.0


def test_grading_is_omitted_from_frontmatter_when_symmetric():
    choices = [
        models.ScoredChoice(id="amazon", text="Amazon", score=1.0),
        models.ScoredChoice(id="parana", text="Parana"),
    ]
    default = models.MultipleChoiceQuestion(stem="Longest river?", choices=choices)
    partial = models.MultipleChoiceQuestion(
        stem="Longest river?", grading="partial", choices=choices
    )
    assert "grading" not in default.frontmatter()
    assert partial.frontmatter()["grading"] == "partial"
