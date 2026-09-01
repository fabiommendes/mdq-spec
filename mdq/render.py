"""
Auxiliary helpers to implement the `render()` methods of the models in this
package.
"""

from __future__ import annotations

import io
from typing import TYPE_CHECKING, Any, Iterable

import yaml

if TYPE_CHECKING:
    from . import models


def common_frontmatter(model: models.BaseQuestion) -> dict[str, Any]:
    """
    Return a dict of the common frontmatter fields for a model.

    The `**kwargs` are passed to `mdq.render.render()`.
    """
    return {
        "id": model.id,
        "uuid": model.uuid,
        "title": model.title,
        "author": model.author,
        "preamble": model.preamble,
        "epilogue": model.epilogue,
        "comment": model.comment,
        "locale": model.locale,
        "tags": model.tags,
        "meta": model.meta,
        "weight": model.weight,
    }


def yield_frontmatter(
    data: dict[str, Any], comment: str | None = None
) -> Iterable[str]:
    """
    Yield lines of the frontmatter as strings.
    """
    if not data and not comment:
        return

    yield "---"
    if comment:
        for line in comment.splitlines():
            yield f"# {line}"

    with io.StringIO() as buf:
        yaml.dump(data, buf)
        dump = buf.getvalue().rstrip()
        if dump and dump != "{}":
            yield dump
    yield "---"


def yield_introduction(
    model: models.BaseQuestion, id: str | None = None
) -> Iterable[str]:
    """
    Yield lines of the introductory sections (preamble, stem) as strings.

    The `id` is passed to `mdq.render.yield_introduction()`.
    """

    if model.preamble:
        if id is not None:
            yield f"[{id}] {model.preamble}"
            id = None
        else:
            yield model.preamble
        if model.stem:
            yield ""

    if id is not None:
        yield f"[{id}] {model.stem}"
    else:
        yield model.stem


def yield_conclusion(
    model: models.BaseQuestion, skip_line: bool = False
) -> Iterable[str]:
    """
    Yield lines of the concluding sections (epilogue) as strings.

    The `**kwargs` are passed to `mdq.render.render()`.
    """
    if model.epilogue:
        if skip_line:
            yield ""
        yield model.epilogue


def yield_choice(
    choice: models.ScoredChoice | models.BooleanChoice | models.Statement, mark: str
):
    """
    Yield lines of a choice as strings.
    """
    text_lines = iter(choice.text.splitlines())
    yield f"* [{mark}] {next(text_lines)}"
    for line in text_lines:
        yield f"  {line}"

    if choice.feedback:
        for line in choice.feedback.splitlines():
            yield f"  > {line}"

    if choice.comment:
        for line in choice.comment.splitlines():
            yield f"  ! {line}"
