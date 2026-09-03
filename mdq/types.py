"""
Type aliases shared across the package.

The document tree itself is modelled with Pydantic in `mdq.models`; this
module holds the aliases that are not models -- the question type
discriminator, and the shapes a student's response may take.
"""

from __future__ import annotations

from fractions import Fraction
from typing import Any, Literal, Required, TypedDict, get_args

QuestionType = Literal[
    "multiple-choice",
    "multiple-selection",
    "true-false",
    "numeric",
    "short-answer",
    "essay",
    "fill-in",
]


QUESTION_TYPES = set(get_args(QuestionType))


#
# JSON-document dicts
#
# These TypedDicts mirror the shapes in `schema/*.yaml` -- one per
# question type, plus the shared pieces (`choices`, `blanks`,
# `tolerance`) they are assembled from. They describe the dict
# `mdq.parser` builds and `mdq.validator.validate_document` checks,
# before it ever becomes a Pydantic model (`mdq.models` mirrors the same
# schemas again, as typed attributes for a *validated* document). Field
# names are the schema's own JSON names -- camelCase, not the models'
# aliased snake_case -- since this is the JSON shape itself.
#
# Per the schemas' `unevaluatedProperties: false`, a value of one of
# these types never carries a field outside what its own TypedDict
# declares.
#
# Ordered broadest first: the exam and question document shapes, then
# the per-type question dicts they are discriminated into, then the
# smaller pieces (choices, blanks) those are assembled from.
#
class ExamDict(TypedDict, total=False):
    """schema/exam.yaml"""

    type: Literal["exam"]
    id: str
    uuid: str
    title: str
    course: str
    author: str
    locale: str
    instructions: str
    tags: list[str]
    meta: dict[str, Any]
    penalty: PenaltyPolicy
    questions: Required[list[ExamEntryDict]]


class IncludeDict(TypedDict):
    """
    A reference to an out-of-line question -- schema/exam.yaml#/$defs/Include.
    """

    include: str


#: One block of an exam's `questions` array -- schema/exam.yaml#/$defs/Entry.
type ExamEntryDict = IncludeDict | QuestionDict

#: Any question document, discriminated by `type` -- the dict shape
#: `mdq.parser.parse_question` returns and `mdq.validator` validates.
type QuestionDict = (
    MultipleChoiceQuestionDict
    | MultipleSelectionQuestionDict
    | TrueFalseQuestionDict
    | NumericQuestionDict
    | ShortAnswerQuestionDict
    | EssayQuestionDict
    | FillInQuestionDict
)


class QuestionBaseDict(TypedDict, total=False):
    """
    Fields common to every question type -- schema/question-base.yaml.
    """

    id: str
    uuid: str
    title: str
    author: str
    stem: Required[str]
    preamble: str
    epilogue: str
    comment: str
    locale: str
    tags: list[str]
    meta: dict[str, Any]


class MultipleChoiceQuestionDict(QuestionBaseDict, total=False):
    """schema/multiple-choice.yaml"""

    type: Required[Literal["multiple-choice"]]
    choices: Required[list[ScoredChoiceDict]]
    shuffle: bool


class MultipleSelectionQuestionDict(QuestionBaseDict, total=False):
    """schema/multiple-selection.yaml"""

    type: Required[Literal["multiple-selection"]]
    choices: Required[list[BooleanChoiceDict]]
    shuffle: bool


class TrueFalseQuestionDict(QuestionBaseDict, total=False):
    """schema/true-false.yaml"""

    type: Required[Literal["true-false"]]
    choices: Required[list[StatementDict]]
    shuffle: bool


class NumericQuestionDict(QuestionBaseDict, total=False):
    """schema/numeric.yaml"""

    type: Required[Literal["numeric"]]
    answer: Required[float]
    unit: str
    domain: NumericDomain
    decimalPlaces: int
    tolerance: ToleranceDict


class ShortAnswerQuestionDict(QuestionBaseDict, total=False):
    """schema/short-answer.yaml"""

    type: Required[Literal["short-answer"]]
    oneOf: list[str]
    regex: str
    exact: bool
    openEnded: bool


class EssayQuestionDict(QuestionBaseDict, total=False):
    """schema/essay.yaml"""

    type: Required[Literal["essay"]]
    input: EssayInput
    highlight: str
    answerKey: str


class FillInQuestionDict(QuestionBaseDict, total=False):
    """schema/fill-in.yaml"""

    type: Required[Literal["fill-in"]]
    blanks: Required[list[BlankDict]]
    shuffle: bool


#: schema/fill-in.yaml#/$defs/Blank -- discriminated by `type`.
type BlankDict = ChoiceBlankDict | ShortAnswerBlankDict | NumericBlankDict


class ChoiceBlankDict(TypedDict, total=False):
    """A fill-in blank graded like multiple-choice -- schema/fill-in.yaml#/$defs/ChoiceBlank."""

    id: Required[str]
    type: Required[Literal["multiple-choice"]]
    choices: Required[list[ScoredChoiceDict]]


class ShortAnswerBlankDict(TypedDict, total=False):
    """schema/fill-in.yaml#/$defs/ShortAnswerBlank"""

    id: Required[str]
    type: Required[Literal["short-answer"]]
    oneOf: list[str]
    regex: str
    exact: bool


class NumericBlankDict(TypedDict, total=False):
    """schema/fill-in.yaml#/$defs/NumericBlank"""

    id: Required[str]
    type: Required[Literal["numeric"]]
    answer: Required[float]
    unit: str
    domain: NumericDomain
    decimalPlaces: int
    tolerance: ToleranceDict


class ScoredChoiceDict(TypedDict, total=False):
    """A multiple-choice option -- schema/multiple-choice.yaml#/$defs/Choice."""

    id: str
    text: Required[str]
    score: float
    feedback: str
    comment: str


class BooleanChoiceDict(TypedDict, total=False):
    """A multiple-selection option -- schema/multiple-selection.yaml#/$defs/Choice."""

    id: str
    text: Required[str]
    correct: bool
    feedback: str
    comment: str


class StatementDict(TypedDict, total=False):
    """A true/false statement -- schema/true-false.yaml#/$defs/Choice."""

    id: str
    text: Required[str]
    correct: bool
    marker: str
    feedback: str
    comment: str


class ToleranceDict(TypedDict, total=False):
    """schema/numeric.yaml#/$defs/Tolerance"""

    absolute: float
    relative: float


#: schema/numeric.yaml and schema/fill-in.yaml#/$defs/NumericBlank.
NumericDomain = Literal["integer", "decimal", "fraction"]

#: schema/essay.yaml.
EssayInput = Literal["code", "text", "plain"]

#: schema/exam.yaml.
PenaltyPolicy = Literal["none", "capped", "full"]


#
# Responses
#
# A response is what a student marked. It is never a document: there is
# no response schema and no Markdown surface for it (see
# docs/adr/0003-no-response-document.md), so these aliases are the whole
# specification of the shape grading accepts.
#
# Several aliases below collapse to the same runtime type -- `str` serves
# both a chosen choice id and an essay. They are kept apart because they
# document which question type produces which, which is the part a
# reader needs.
#
# Ordered broadest first: a whole exam's responses, then a single
# question's response, then the per-type shapes it may take.
#

#: Every response in one exam attempt, keyed by question id. A question
#: absent from the mapping is skipped; a key naming no question in the
#: exam is a `ResponseError`.
type ExamResponses = dict[str, QuestionResponse]

#: Any response to a single question. `None` means the question was
#: skipped: it scores 0 without its grading formula running, so it
#: produces no feedback either.
type QuestionResponse = (
    MultipleChoiceResponse
    | MultipleSelectionResponse
    | TextResponse
    | NumericResponse
    | FillInResponse
    | TrueFalseResponse
    | None
)

#: multiple-choice: the id of the choice the student picked.
type MultipleChoiceResponse = str

#: multiple-selection: what the student marked for each
#: choice, keyed by choice id. A missing key means the student did not
#: mark that choice, which each type reads its own way -- an unticked
#: multiple-selection choice asserts false
type MultipleSelectionResponse = dict[str, bool]

#: true-false: the student's choice, `True` or `False`. Explicit skips are
#: `None`.
type TrueFalseResponse = dict[str, bool | None]

#: short-answer and essay: the text the student wrote, before
#: normalisation.
type TextResponse = str

#: numeric: the value the student entered. A `str` carries an exact
#: rational ("1/3"), which no float can represent.
type NumericResponse = int | float | Fraction | str

#: fill-in: each blank's response, keyed by blank id, taking whatever
#: that blank's own type takes.
type FillInResponse = dict[str, QuestionResponse]
