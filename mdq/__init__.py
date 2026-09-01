"""mdq: tools for the MDQ (Markdown Questions) file format."""

from typing import IO

from . import models as _models
from . import parser as _parser
from .errors import ParseError
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


def parse_exam(src: str | IO[str]) -> Exam:
    """
    Parse an exam document from its Markdown source.

    Args:
        src: The Markdown source of the exam document, or a file-like
        object containing it.

    Raises:
        ParseError: If the document is not valid MDQ.
    """
    if not isinstance(src, str):
        src = src.read()
    data = _parser.parse_exam(src)
    return Exam.model_validate(data)
