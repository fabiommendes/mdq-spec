"""
Pydantic models for the MDQ document tree and for grading results.

These models are the public shape of a *validated* document. The
pipeline is markdown -> json -> json validated against `schema/` ->
model, so a model is what "parse, don't validate" hands back: by the
time one exists, the document is known to be well formed.

Two rules govern this module:

1. The models mirror the JSON schemas in `schema/` and MUST NEVER be
   stricter than them. The schemas are the normative artifact -- other
   implementations consume them -- and a model that rejects what a
   schema accepts silently deletes a lint rule. `locale` is a plain
   string because `malformed-locale` explains malformed ones; `regex`
   is a plain string because `invalid-regex` explains uncompilable
   ones. Do not "improve" either.

2. Field names are the schema's names in snake_case, with the camelCase
   spelling kept as an alias, so a model round-trips to the document it
   came from.

Nothing here is implemented yet: the fields are the design.
"""

from __future__ import annotations

from typing import Annotated, Any, Iterable, Literal, Self

import opt
from pydantic import BaseModel, ConfigDict, Field, RootModel
from pydantic.alias_generators import to_camel

from . import render


class MdqModel(BaseModel):
    """
    Base configuration shared by every model in the document tree.

    `extra="forbid"` mirrors the schemas' `unevaluatedProperties: false`
    -- equal strictness, not more.
    """

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )

    def __str__(self) -> str:
        """
        Return a Markdown representation of the model.

        The `**kwargs` are passed to `mdq.render.render()`.
        """
        return self.render()

    def to_dict(self, by_alias: bool = True) -> dict:
        """
        Return a dict representation of the model that is compatible with the
        JSON schema and the original document.
        """
        return self.model_dump(
            by_alias=by_alias,
            exclude_none=True,
            exclude_defaults=True,
        )

    def _render_lines(self) -> Iterable[str]:
        """
        Used by subclasses to implement `render_lines()`.

        Must return a generator yielding a Markdown representation of the model
        as an iterable of lines. The final rendering is the concatenation
        of these lines with newlines in between.
        """
        raise NotImplementedError("Subclasses must implement _render_lines()")

    def render(self) -> str:
        """
        Return a Markdown representation of the model.

        The `**kwargs` are passed to `mdq.render.render()`.
        """
        return "\n".join(self._render_lines())


#
# Shared vocabulary
#

#: How a question with several parts reduces them to one score.
#: `symmetric` may go below zero; `partial` stays within [0, 1] while
#: still awarding credit for parts; `all-or-nothing` returns 1 or 0.
#: `partial` names a range, not one formula -- each question type
#: defines its own (see docs/adr/0002-partial-names-a-range-not-an-algorithm.md).
GradingStrategy = Literal["symmetric", "partial", "all-or-nothing"]

#: An exam's policy for whether a negative question score survives.
#: Questions never clamp their own score -- this is the only place
#: clamping happens (see
#: docs/adr/0001-score-scale-and-exam-level-clamping.md).
PenaltyPolicy = Literal["none", "capped", "full"]

NumericDomain = Literal["integer", "decimal", "fraction"]

EssayInput = Literal["code", "text", "plain"]


class Tolerance(MdqModel):
    absolute: float | None = None
    relative: float | None = None


class ScoredChoice(MdqModel):
    """
    A multiple-choice option, or a choice inside a fill-in choice blank.

    `score` is bounded to [-1, 1]: 1 is correct, 0 incorrect, and a
    negative value penalises picking it.
    """

    id: str | None = None
    text: str
    score: Annotated[float | None, Field(default=None, ge=-1, le=1)] = None
    feedback: str | None = None
    comment: str | None = None


class BooleanChoice(MdqModel):
    """
    A multiple-selection option: the key says whether it belongs in the
    answer, and there is no per-choice score.
    """

    id: str | None = None
    text: str
    correct: bool = False
    feedback: str | None = None
    comment: str | None = None


class Statement(MdqModel):
    """
    One true/false statement. Structurally a `BooleanChoice` plus the
    marker that spelled it in the Markdown source.
    """

    id: str | None = None
    text: str
    correct: bool = False
    marker: str | None = None
    feedback: str | None = None
    comment: str | None = None


#
# Questions
#
class BaseQuestion(MdqModel):
    """
    Fields every question type carries.

    `id` is optional here and required for grading: a document that
    lacks one is valid but not *addressable*, and the system using the
    library is expected to supply it.
    """

    id: str | None = None
    uuid: str | None = None
    title: str | None = None
    author: str | None = None
    stem: str
    preamble: str | None = None
    epilogue: str | None = None
    comment: str | None = None
    locale: str | None = None
    meta: dict[str, object] | None = None
    tags: list[str] = Field(default_factory=list)

    #: How much this question counts towards its exam. An exam entry may
    #: override it, and resolution applies that override here, so the
    #: value on a resolved question is always the winning one.
    weight: Annotated[float, Field(ge=0)] = 1.0

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        """
        Return a dict representation of the model that is compatible with the
        frontmatter of the original document.
        """

        data: dict[str, Any] = {
            "id": self.id,
            "uuid": self.uuid,
            "title": self.title,
            "author": self.author,
            "locale": self.locale,
            "meta": self.meta,
        }
        if skip_defaults:
            data = _clear_nones(data)
        if self.weight != 1.0 or not skip_defaults:
            data["weight"] = self.weight
        if self.tags != [] or not skip_defaults:
            data["tags"] = self.tags
        return data

    def _render_lines(self) -> Iterable[str]:
        frontmatter = self.frontmatter(skip_defaults=True)

        # If the frontmatter would only have in "id", we render it inline in the
        # preamble or stem.
        id = self.id
        if not self.comment and frontmatter.keys() == {"id"}:
            ...
        else:
            id = None
            yield from render.yield_frontmatter(frontmatter, self.comment)
            yield ""

        yield from render.yield_introduction(self, id=id)
        yield from self._render_body()
        yield from render.yield_conclusion(self, skip_line=True)

    def _render_body(self) -> Iterable[str]:
        """
        model's body as an iterable of lines.
        """
        raise NotImplementedError("Subclasses must implement _render_body()")

    def normalize(self) -> Self:
        """
        Return a copy of the model with normalized fields.

        Normalization is not a validation step: it does not check that
        the model is valid, only that its fields are in a canonical form.
        """
        copy = self.model_copy()
        copy._normalize()
        return copy

    def _normalize(self) -> None:
        """
        Normalize *inplace*.
        """
        self.preamble = opt.map(normalize_paragraphs, self.preamble)
        self.epilogue = opt.map(normalize_paragraphs, self.epilogue)
        self.comment = opt.map(remove_trailing_ws, self.comment)
        self.stem = self.stem.strip()
        self.tags = [tag.strip() for tag in self.tags if tag.strip()]
        self.author = opt.map(str.strip, self.author)


class MultipleChoiceQuestion(BaseQuestion):
    choices: list[ScoredChoice]
    type: Literal["multiple-choice"] = "multiple-choice"
    shuffle: bool | None = None

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.shuffle is not None:
            data["shuffle"] = self.shuffle
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        for choice in self.choices:
            score = choice.score
            if score == 1.0:
                mark = "*"
            elif score == 0.0 or score is None:
                mark = " "
            else:
                mark = f"{score * 100}%"

            yield from render.yield_choice(choice, mark=mark)


class MultipleSelectionQuestion(BaseQuestion):
    choices: Annotated[list[BooleanChoice], Field(min_length=2)]
    type: Literal["multiple-selection"] = "multiple-selection"
    shuffle: bool | None = None
    grading: GradingStrategy = "symmetric"

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.shuffle is not None:
            data["shuffle"] = self.shuffle
        if self.grading != "symmetric":
            data["grading"] = self.grading
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        for choice in self.choices:
            mark = "x" if choice.correct else " "
            yield from render.yield_choice(choice, mark=mark)


class TrueFalseQuestion(BaseQuestion):
    choices: Annotated[list[Statement], Field(min_length=2)]
    type: Literal["true-false"] = "true-false"
    shuffle: bool | None = None
    grading: GradingStrategy = "symmetric"

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.shuffle is not None:
            data["shuffle"] = self.shuffle
        if self.grading != "symmetric":
            data["grading"] = self.grading
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        for choice in self.choices:
            # Use locale to choose better markings?
            mark = "T" if choice.correct else "F"
            if choice.marker:
                mark = choice.marker
            yield from render.yield_choice(choice, mark=mark)


class NumericQuestion(BaseQuestion):
    #: The correct value. A `str` carries an exact rational ("1/3"),
    #: which no float can represent.
    answer: float | str
    type: Literal["numeric"] = "numeric"
    unit: str | None = None
    domain: NumericDomain | None = None
    decimal_places: int | None = Field(default=None, ge=0)
    tolerance: Tolerance | None = None

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.domain is not None:
            data["domain"] = self.domain
        if self.decimal_places is not None:
            data["decimalPlaces"] = self.decimal_places
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        yield _render_numeric_tag(
            self.answer,
            unit=self.unit,
            tolerance=self.tolerance,
        )


class ShortAnswerQuestion(BaseQuestion):
    type: Literal["short-answer"] = "short-answer"
    one_of: list[str] | None = None
    regex: str | None = None
    exact: bool = False

    #: When true the question has no machine-checkable key and is graded
    #: by hand, so `oneOf` and `regex` must both be absent.
    open_ended: bool = False

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.exact:
            data["exact"] = True
        if self.open_ended:
            data["openEnded"] = True
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        if self.regex is not None:
            yield f"[short-answer]: /{self.regex}/"
        elif self.one_of is None:
            yield "[short-answer]:"
        elif len(self.one_of) == 1:
            yield f"[short-answer]: {self.one_of[0]}"
        else:
            yield "[short-answer]:"
            for answer in self.one_of:
                yield f"* {answer}"


class EssayQuestion(BaseQuestion):
    type: Literal["essay"] = "essay"
    input: EssayInput = "text"
    highlight: str | None = None

    #: A model answer for the human grading this. Carrying one does not
    #: make the question auto-gradable.
    answer_key: str | None = None

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.input != "text":
            data["input"] = self.input
        if self.highlight is not None:
            data["highlight"] = self.highlight
        return data

    def _render_body(self) -> Iterable[str]:
        yield ""
        yield "[essay]"

    def _render_lines(self) -> Iterable[str]:
        yield from super()._render_lines()
        if self.answer_key is not None:
            yield ""
            yield "## [answer-key]"
            yield ""
            yield self.answer_key


class ChoiceBlank(MdqModel):
    id: str
    type: Literal["multiple-choice"] = "multiple-choice"
    choices: list[ScoredChoice]


class ShortAnswerBlank(MdqModel):
    id: str
    type: Literal["short-answer"] = "short-answer"
    one_of: list[str] | None = None
    regex: str | None = None
    exact: bool = False


class NumericBlank(MdqModel):
    id: str
    type: Literal["numeric"] = "numeric"
    answer: float | str
    unit: str | None = None
    domain: NumericDomain | None = None
    decimal_places: Annotated[int | None, Field(ge=0)] = None
    tolerance: Tolerance | None = None


Blank = Annotated[
    ChoiceBlank | ShortAnswerBlank | NumericBlank,
    Field(discriminator="type"),
]


class FillInQuestion(BaseQuestion):
    blanks: list[Blank]
    type: Literal["fill-in"] = "fill-in"
    shuffle: bool | None = None
    grading: GradingStrategy = "symmetric"

    def frontmatter(self, skip_defaults: bool = False) -> dict[str, Any]:
        data = super().frontmatter(skip_defaults=skip_defaults)
        if self.shuffle is not None:
            data["shuffle"] = self.shuffle
        if self.grading != "symmetric":
            data["grading"] = self.grading
        return data

    def _render_body(self) -> Iterable[str]:
        for blank in self.blanks:
            yield ""
            if isinstance(blank, ChoiceBlank):
                yield f"[^{blank.id}]:"
                for choice in blank.choices:
                    score = choice.score
                    if score == 1.0:
                        mark = "*"
                    elif score in (0.0, None):
                        mark = " "
                    else:
                        mark = f"{score * 100}%"
                    yield from render.yield_choice(choice, mark=mark)
            elif isinstance(blank, ShortAnswerBlank):
                if blank.regex is not None:
                    yield f"[^{blank.id}/short-answer]: /{blank.regex}/"
                else:
                    answers = blank.one_of or [""]
                    yield f"[^{blank.id}/short-answer]: {answers[0]}"
            else:
                yield _render_numeric_tag(
                    blank.answer,
                    tag=f"[^{blank.id}/numeric]",
                    tolerance=blank.tolerance,
                )


Question = Annotated[
    MultipleChoiceQuestion
    | MultipleSelectionQuestion
    | TrueFalseQuestion
    | NumericQuestion
    | ShortAnswerQuestion
    | EssayQuestion
    | FillInQuestion,
    Field(discriminator="type"),
]


class QuestionRoot(RootModel):
    root: Question


#
# Exams
#
class Exam(MdqModel):
    """
    A resolved exam.

    `include` entries are resolved before a model is built, so a
    `Question` here is always a real question -- there is no `Include`
    member. Resolution also applies each entry's `weight` override onto
    the question it resolved.
    """

    type: Literal["exam"] = "exam"
    id: str | None = None
    uuid: str | None = None
    title: str | None = None
    course: str | None = None
    author: str | None = None
    locale: str | None = None
    instructions: str | None = None
    tags: list[str] | None = None
    meta: dict[str, object] | None = None
    penalty: PenaltyPolicy = "none"
    questions: list[Question]


#
# Grading results
#
class QuestionScore(MdqModel):
    """
    What one response to one question was worth.

    `score` is the raw value, in [-1, 1], with no exam policy applied --
    clamping belongs to the exam (see
    docs/adr/0001-score-scale-and-exam-level-clamping.md).
    """

    score: float = Field(ge=-1, le=1)

    #: Feedback triggered by this response, in the order the choices
    #: appear in the document. What triggers it depends on the question
    #: type: the picked choice in multiple-choice, wrongly judged
    #: choices in multiple-selection, wrongly judged or unjudged
    #: statements in true-false. A skipped question triggers none.
    feedback: list[str] = Field(default_factory=list)


class ExamScore(MdqModel):
    """
    What a whole exam attempt was worth.

    Covers auto-gradable questions only. `score` is the weighted mean of
    their scores after the exam's `penalty` policy is applied, and is
    `None` when nothing was auto-gradable -- an exam of essays, or one
    where every weight is zero. `None` is not a zero: it means no
    auto-grade exists.
    """

    score: float | None = Field(default=None, ge=-1, le=1)

    #: Weight of the questions that `score` covers, and of the whole
    #: exam. Two absolute values rather than a fraction, so "0.8 over
    #: 70% of the exam" needs no guessing about the denominator.
    graded_weight: float = Field(ge=0)
    total_weight: float = Field(ge=0)

    #: Ids of the questions awaiting a human grader. These are absent
    #: from `questions`; the union of the two is the exam.
    pending: list[str] = Field(default_factory=list)

    #: Per-question results, keyed by question id, for the auto-gradable
    #: questions only.
    questions: dict[str, QuestionScore] = Field(default_factory=dict)


#
# Utilities
#
def _clear_nones(d: dict[str, Any]) -> dict[str, Any]:
    """
    Return a copy of `d` with all `None` values removed.
    """
    return {k: v for k, v in d.items() if v is not None}


def _render_numeric_tag(
    answer: float | str,
    *,
    tag: str = "[numeric]",
    unit: str | None = None,
    tolerance: Tolerance | None = None,
) -> str:
    """Return a numeric answer tag in the parser's accepted syntax."""
    if unit is not None:
        tag = f"{tag[:-1]}({unit})]"

    terms = [str(answer)]
    if tolerance is not None:
        if tolerance.absolute is not None:
            terms.append(f"+- {tolerance.absolute}")
        if tolerance.relative is not None:
            terms.append(f"+- {tolerance.relative * 100}%")
    return f"{tag}: {' '.join(terms)}"


def normalize_paragraphs(src: str) -> str:
    """
    Normalize a string that is a Markdown paragraph or series of
    paragraphs.

    This is used to normalize the `preamble` and `epilogue` fields of
    questions, which are Markdown blocks but not full documents.
    """
    return "\n\n".join(p.strip() for p in src.split("\n\n"))


def remove_trailing_ws(src: str) -> str:
    """
    Remove trailing whitespace from each line in a string.
    """
    return "\n".join(line.rstrip() for line in src.split("\n"))
