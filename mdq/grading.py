"""
Grading: turning responses into scores.

Everything here operates on already-validated models and does no I/O.
Includes are resolved and documents validated earlier in the pipeline,
so grading's only preconditions are the two it cannot delegate:

* the document is **addressable** -- every question and every choice
  carries an id, so a response can name what it refers to;
* the response is compatible with the question it answers.

Both are checked here rather than by the schemas, because a document
that fails either is still a perfectly valid MDQ document. Parsing never
requires ids; grading always does.

Nothing here is implemented yet: the signatures are the design.
"""

from __future__ import annotations

from mdq.models import Exam, ExamScore, Question, QuestionScore
from mdq.types import ExamResponses, QuestionResponse


def score_question(question: Question, response: QuestionResponse) -> QuestionScore:
    """
    Score one response against one question.

    The score is raw, in [-1, 1], with no exam policy applied: an exam's
    `penalty` decides whether negatives survive, and a question graded
    on its own has no policy to obey.

    A `response` of `None` means the question was skipped. It scores 0
    without the grading formula running, so it produces no feedback
    either.

    Raises:
        MissingIdError: the question, or one of its choices, has no id.
        ResponseError: the response is one the question cannot
            represent -- a decimal answer to an `integer` question, a
            unit that is not the declared one, a choice id naming
            nothing.
        NotAutoGradable: the question has no machine-checkable answer
            key, i.e. an essay or an `openEnded` short answer.
    """
    raise NotImplementedError


def score_exam(exam: Exam, responses: ExamResponses) -> ExamScore:
    """
    Score a whole exam attempt.

    `responses` is keyed by question id. A question absent from the
    mapping was skipped and scores 0, staying in the denominator; a key
    naming no question in the exam is an error, since it is far more
    likely to be a stale or misspelled id than a deliberate extra.

    Responses to manually-graded questions are accepted and ignored --
    an LMS should not have to strip essay answers out before calling
    this -- and those questions are reported in `ExamScore.pending`.

    Raises:
        MissingIdError: some question or choice has no id.
        UnresolvedInclude: the exam still holds an `include` entry.
        ResponseError: a response is incompatible with its question, or
            names a question the exam does not contain.
    """
    raise NotImplementedError


def check_addressable(document: Question | Exam) -> None:
    """
    Raise unless every question and choice in `document` carries an id.

    `score_question` and `score_exam` call this themselves, so callers
    never have to remember it. It is public for the one case worth
    catching early: an LMS can ask, while an exam is being authored,
    whether it will be gradable once students have sat it -- which is
    the last moment when adding an id is cheap.

    Blanks are not checked: `fill-in.yaml` already requires their ids.

    Raises:
        MissingIdError: naming the first question or choice without one.
        UnresolvedInclude: the exam still holds an `include` entry.
    """
    raise NotImplementedError
