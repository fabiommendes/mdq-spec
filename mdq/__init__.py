"""mdq: tools for the MDQ (Markdown Questions) file format."""

from typing import IO

from . import models as _models
from . import parser as _parser
from .errors import ParseError
from .loaders import QuestionLoader
from .models import Exam, Question

__version__ = "0.1.0"
__all__ = [
    "Question",
    "Exam",
    "parse_question",
    "ParseError",
]


def parse_question(src: str | IO[str]) -> Question:
    """
    Parse a question document from its Markdown source.

    Args:
        src: The Markdown source of the question document, or a file-like
        object containing it.

    Raises:
        ParseError: If the document is not valid MDQ.
    """
    if not isinstance(src, str):
        src = src.read()
    data = _parser.parse_question(src)
    return _models.QuestionRoot.model_validate(data).root


def parse_exam(src: str | IO[str], loader: QuestionLoader | None = None) -> Exam:
    """
    Parse an exam document from its Markdown source.

    Args:
        src: The Markdown source of the exam document, or a file-like
        object containing it.
        loader: Resolves an exam's `include:` references, if given.
        Left unresolved otherwise, which fails model validation as soon
        as the exam holds one -- an `include` entry is not a `Question`.
        The common case is `FileLoader(path.parent)`, resolving against
        the exam's own directory; see `mdq.loaders`.

    Raises:
        ParseError: If the document is not valid MDQ.
    """
    if not isinstance(src, str):
        src = src.read()
    data = _parser.parse_exam(src, loader=loader)
    return Exam.model_validate(data)
