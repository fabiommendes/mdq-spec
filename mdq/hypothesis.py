from typing import Any, Callable, get_args

from hypothesis import strategies as st

from . import models
from .types import QuestionType

__all__ = ["question", "exam"]

# QUESTION_TYPES = get_args(QuestionType)
QUESTION_TYPES: tuple[QuestionType, ...] = ("essay",)
CODE_HIGHLIGHT_FORMATS = [
    "python",
    "javascript",
    "js",
    "py",
    "typescript",
    "java",
    "c",
    "c++",
    "cpp",
    "html",
    "css",
    "bash",
    "json",
    "yaml",
]


#
# Question strategies
#
def question(
    *,
    type: QuestionType | None = None,
    normalize: bool = False,
) -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    possible_types = (type,) if type is not None else QUESTION_TYPES
    question = st.sampled_from(possible_types).flatmap(
        lambda t: QUESTION_STRATEGIES[t]()
    )

    if normalize:
        question = question.map(lambda q: q.normalize())
    return question


def multiple_choice_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.MultipleChoiceQuestion,
        **_base_question_kwargs(),
    )


def multiple_selection_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.MultipleSelectionQuestion,
        **_base_question_kwargs(),
    )


def true_false_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.TrueFalseQuestion,
        **_base_question_kwargs(),
    )


def numeric_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.NumericQuestion,
        **_base_question_kwargs(),
    )


def short_answer_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.ShortAnswerQuestion,
        **_base_question_kwargs(),
    )


def essay_question(
    *,
    input: models.EssayInput | None = None,
) -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    if input is None:
        inputs = get_args(models.EssayInput)
        return st.sampled_from(inputs).flatmap(lambda t: essay_question(input=t))

    return st.builds(
        models.EssayQuestion,
        highlight=code_highlight() | st.none() if input == "code" else st.none(),
        **_base_question_kwargs(),
    )


def fill_in_question() -> st.SearchStrategy[models.Question]:
    """
    Return a strategy for generating questions of the given type.

    If `type` is `None`, any question type is allowed.
    """
    return st.builds(
        models.FillInQuestion,
        **_base_question_kwargs(),
    )


#
# Exam strategies
#
def exam(max_questions: int) -> st.SearchStrategy[models.Exam]:
    """
    Create a strategy for generating an exam with up to `max_questions`
    questions.
    """
    return st.builds(
        models.Exam,
        # id=st.none() | st.text(),
        # uuid=st.none() | st.text(),
        # title=st.none() | st.text(),
        # course=st.none() | st.text(),
        # author=st.none() | st.text(),
        # locale=st.none() | st.text(),
        # instructions=st.none() | st.text(),
        # tags=st.none() | st.lists(st.text(), min_size=1),
        # meta=st.none() | st.dictionaries(st.text(), st.just(None) | st.text()),
        # penalty=st.just("none"),
        # questions=st.lists(question(), min_size=1, max_size=max_questions),
    )


#
# Auxiliary strategies
#
def code_highlight() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating code formats for highlighting.
    """
    return st.sampled_from(CODE_HIGHLIGHT_FORMATS)


def md_paragraph() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating markdown paragraphs.
    """
    return st.text(
        alphabet=st.characters(
            blacklist_categories=("Cs", "Cc", "Zl", "Zp"),
            blacklist_characters="\n",
        ),
        min_size=1,
    ).filter(lambda s: (s := s.lstrip()) and s[0] not in "#-+*>[")


def md_safe_block() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating markdown blocks that are safe to use in
    tests.
    """
    return (
        md_paragraph() | md_code_block()
    )  # | md_list() | md_blockquote() | md_table() | ...


def md_safe_blocks(min_size: int = 1, max_size: int = 3) -> st.SearchStrategy[str]:
    """
    Return a strategy for generating a list of markdown blocks that are safe to
    use in tests.
    """
    return st.lists(md_safe_block(), min_size=min_size, max_size=max_size).map(
        lambda blocks: "\n\n".join(blocks)
    )


def md_code_block() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating markdown code blocks.
    """
    return st.builds(
        lambda lang, code: f"```{lang}\n{code}\n```",
        lang=st.sampled_from(CODE_HIGHLIGHT_FORMATS),
        code=st.text(
            alphabet=st.characters(
                blacklist_categories=("Cs", "Cc", "Zl", "Zp"),
                blacklist_characters="\n",
            ),
            min_size=1,
        ).filter(lambda s: "```" not in s),
    )


def safe_text(multiline: bool = False) -> st.SearchStrategy[str]:
    """
    Somewhat safe text for use in tests. It excludes control characters, line
    separators, and paragraph separators. It also excludes the empty string.
    """
    return st.text(
        alphabet=st.characters(
            blacklist_categories=("Cs", "Cc", "Zl", "Zp"),
            blacklist_characters="\n" if not multiline else None,
        ),
        min_size=1,
    )


def slug() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating slugs (lowercase alphanumeric strings with
    hyphens).
    """
    return st.text(
        alphabet=st.characters(
            whitelist_categories=("Ll", "Nd"),
            blacklist_characters="-",
        ),
        min_size=1,
    ).map(lambda s: s.lower().replace(" ", "-"))


def uuid() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating UUIDs.
    """
    return st.uuids().map(str)


def locale() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating locale strings.
    """
    # TODO: generalize this to any valid locale string, not just a few common ones.
    return st.sampled_from(["en", "es", "fr", "de", "pt", "zh", "ja", "ko"])


def tag() -> st.SearchStrategy[str]:
    """
    Return a strategy for generating tags.
    """
    return st.text(
        alphabet=st.characters(
            whitelist_categories=("Ll", "Nd"),
            blacklist_characters="-",
        ),
        min_size=1,
    )


def weight() -> st.SearchStrategy[float]:
    """
    Return a strategy for generating weights (non-negative floats).
    """
    return st.floats(min_value=0.0, allow_nan=False, allow_infinity=False).map(
        lambda x: round(x, 3)
    ) | st.just(1.0)  # default weight is 1.0


#
# Utility functions
#
def _base_question_kwargs() -> dict[str, st.SearchStrategy[Any]]:
    """
    Return a dict of strategies to build question fields.

    We can't be very type-safe here due to Python's limitations on the type
    system.
    """
    return {
        "id": st.none() | slug(),
        "uuid": st.none() | uuid(),
        "title": st.none() | safe_text(),
        "author": st.none() | safe_text(),
        "stem": md_paragraph(),
        "preamble": st.none() | md_safe_blocks(),
        "epilogue": st.none() | md_safe_blocks(),
        "comment": st.none() | safe_text(multiline=True),
        "locale": st.none() | locale(),
        "tags": st.lists(tag(), min_size=1),
        "weight": weight(),
        # "meta": st.none() | st.dictionaries(st.text(), st.just(None) | st.text()),
    }


QUESTION_STRATEGIES: dict[
    QuestionType, Callable[[], st.SearchStrategy[models.Question]]
] = {
    "essay": essay_question,
    # "multiple-choice": multiple_choice_question,
    # "multiple-selection": multiple_selection_question,
    # "true-false": true_false_question,
    # "numeric": numeric_question,
    # "short-answer": short_answer_question,
    # "fill-in": fill_in_question,
}
