"""
Type aliases shared across the package.

The document tree itself is modelled with Pydantic in `mdq.models`; this
module holds the aliases that are not models -- the question type
discriminator, and the shapes a student's response may take.
"""

from fractions import Fraction
from typing import Literal, get_args

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

#: multiple-choice: the id of the choice the student picked.
type ChoiceResponse = str

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

#: Any response to a single question. `None` means the question was
#: skipped: it scores 0 without its grading formula running, so it
#: produces no feedback either.
type QuestionResponse = (
    ChoiceResponse
    | MultipleSelectionResponse
    | TextResponse
    | NumericResponse
    | FillInResponse
    | None
)

#: Every response in one exam attempt, keyed by question id. A question
#: absent from the mapping is skipped; a key naming no question in the
#: exam is a `ResponseError`.
type ExamResponses = dict[str, QuestionResponse]
