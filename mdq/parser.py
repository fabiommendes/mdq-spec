# doc0: skip
"""
A basic Markdown parser for the MDQ file format.

This module turns MDQ Markdown source (frontmatter + introduction + body +
epilogue, as described in ``docs/question-types/generic.md``) into the same
dict shape that ``mdq.validator.validate_document`` expects, i.e. the
shape documented by ``schema/*.yaml``.

Design notes
------------
We use ``markdown-it-py`` to get *block*-level structure (paragraphs,
headings, bullet lists) because that part of CommonMark -- what starts a
new block, when a list interrupts a paragraph, etc. -- is exactly the kind
of thing not worth reimplementing. But MDQ layers its own inline
mini-grammars on top of plain block content (choice markers, feedback `>`
and comment `!` lines inside a single list item, the `[numeric(unit)]:`
tag, ...) that are not CommonMark constructs -- markdown-it has no idea
what a "feedback line" is, and in fact a run of `!`-prefixed lines
directly under a `>` blockquote gets lazily absorbed *into* the
blockquote's paragraph by CommonMark's lazy-continuation rule, which
throws away exactly the split we need. So once we know a block's *line
range* (`node.map`), we re-read those raw source lines ourselves for
anything with MDQ-specific syntax, rather than trusting markdown-it's
subtree for it. Plain prose blocks (preamble, stem, epilogue, choice/blank
text) are just reconstructed from their raw lines, soft-wrapped lines
joined with a single space -- the same collapsing a YAML folded (`>-`)
scalar does, which is how every paired `.yaml` fixture represents them.

The public functions below are thin wrappers around `ParseMDQ`, a
recursive-descent parser that walks a cursor over one question's block
children.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, NamedTuple

import yaml
from markdown_it import MarkdownIt
from markdown_it.tree import SyntaxTreeNode as Node

from .errors import IncompleteQuestion, MissingField, ParseError
from .loaders import QuestionLoader

__all__ = [
    "parse_any",
    "parse_file",
    "parse_exam",
    "parse_question",
    "is_exam",
    "reconstruct_blocks",
]

#
# Constants
#

md = MarkdownIt("gfm-like")


# MDQ's own tags (`[short-answer]: ...`, `[numeric]: ...`, `[^blank]: ...`)
# are syntactically indistinguishable from CommonMark link reference
# definitions (`[label]: destination`), which are otherwise consumed
# silently with no token emitted at all. Disable that rule so these lines
# survive as ordinary paragraphs for us to pattern-match.
md.block.ruler.disable("reference")

# Slugs and choice ids.
SLUG_BODY_RE = r"[a-zA-Z0-9]+(?:[-_][a-zA-Z0-9]+)*"
SLUG_PREFIX_RE = re.compile(rf"^\[(?P<slug>{SLUG_BODY_RE})\]\s*")
CHOICE_ID_PREFIX_RE = re.compile(rf"^\[(?P<id>{SLUG_BODY_RE})\]\s*")

# Single-glyph choices (a lone symbol or digit) slugify to nothing useful
# once punctuation is stripped, so they get a small name table instead --
# this is the "typical case" workaround docs/question-types/multiple-choice.md
# gestures at (`! -> bang`, `? -> question`).
DIGIT_NAMES = {
    "0": "zero",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "five",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
}
SYMBOL_NAMES = {
    "-": "hyphen",
    "*": "asterisk",
    "+": "plus",
    "!": "bang",
    "?": "question",
    "/": "slash",
    ".": "dot",
    ",": "comma",
    ":": "colon",
    ";": "semicolon",
    "@": "at",
    "#": "hash",
    "$": "dollar",
    "%": "percent",
    "&": "ampersand",
    "=": "equals",
    "_": "underscore",
}

# Body-start detection.
ESSAY_TAG_RE = re.compile(r"^\[essay\]$")
SHORT_ANSWER_RE = re.compile(r"^\[short-answer\]:\s*(?P<rest>.*)$")
NUMERIC_TAG_RE = re.compile(r"^\[numeric(?:\((?P<unit>[\w.\-]+)\))?\]:\s*(?P<rest>.*)$")
BLANK_RE = re.compile(
    rf"^\[\^(?P<id>{SLUG_BODY_RE})(?:/(?P<type>[a-zA-Z-]+))?\]:\s*(?P<rest>.*)$"
)
BRACKET_ITEM_RE = re.compile(r"^[*+-]\s*\[")
ANSWER_KEY_RE = re.compile(r"^\[answer-key\]$")

# Choice-list parsing.
ITEM_MARKER_RE = re.compile(r"^[*+-]\s+\[(?P<value>[^\]]*)\]\s?(?P<rest>.*)$")
PERCENT_RE = re.compile(r"^[+-]?\d+(?:\.\d+)?%$")
PLAIN_ITEM_RE = re.compile(r"^[*+-]\s+(?P<rest>.*)$")

# True/false marker classification, per
# docs/question-types/true-false.md#body. Only FALSE letters mean false;
# TRUE and PROVISIONAL letters both mean true. CJK characters have no
# case, so they're listed once rather than lowercased.
FALSE_LETTERS = {"f", "错", "偽"}

# Numeric body parsing.
NUM_VALUE_RE = re.compile(
    r"^(?P<sign>[+-])?(?P<value>\d+/\d+|\d+\.\d+|\d+)"
    r"(?P<tolerances>(?:\s*\+-\s*\d+(?:\.\d+)?%?)*)\s*$"
)
TOL_TERM_RE = re.compile(r"\+-\s*(?P<num>\d+(?:\.\d+)?)(?P<pct>%)?")

# Exams.
#: An exam's questions are separated by a line of exactly three equals
#: signs. It must be preceded by a blank line -- without one, CommonMark
#: reads it as a setext underline and turns the paragraph above into an
#: H1, which is the exam-title syntax.
SEPARATOR = "==="

#: `# Title` or `# [slug] Title`.
H1_RE = re.compile(r"^#[ \t]+(?P<rest>.*?)[ \t]*$")

#: Fields a question inherits from the exam when it declares none itself.
#: `tags` is deliberately absent -- tags classify a question individually.
INHERITED_FIELDS = ("locale", "author")


#
# Public API
#
def parse_any(text: str, loader: QuestionLoader | None = None) -> dict[str, Any]:
    """
    Parse MDQ source into a JSON-like document, dispatching on its kind.

    Returns an exam document when the source carries an H1 title, and a
    question document otherwise.

    Args:
        text: MDQ source text, with or without YAML frontmatter.
        loader: Resolves an exam's `include:` references, if given. Only
            consulted when `text` turns out to be an exam; see
            `parse_exam`.

    Returns:
        The parsed exam or question document, in the shape validated by
        `mdq.validator.validate_document`.

    Raises:
        ParseError: If the source is not valid MDQ.
        MissingField: If a required field (e.g. `stem`, `title`) is
            missing.
        IncompleteQuestion: If a question's type cannot be inferred.

    Example:
        >>> parse_any("What is 2 + 2?\\n\\n* [x] 4\\n* [ ] 5\\n")["type"]
        'multiple-selection'
    """

    if is_exam(text):
        return parse_exam(text, loader=loader)
    return parse_question(text)


def parse_file(path: Path, loader: QuestionLoader | None = None) -> dict[str, Any]:
    """
    Parse a file, dispatching on whether it holds an exam or a question.

    Includes are left unresolved unless a `loader` is given. Resolution is
    deliberately not automatic: where a question lives is the host's
    business, and an exam whose includes have not been resolved is still a
    well-formed document. To resolve against the exam's own directory,
    pass ``FileLoader(path.parent)``.

    Args:
        path: Path to the MDQ source file.
        loader: Resolves an exam's `include:` references, if given.

    Returns:
        The parsed exam or question document, in the shape validated by
        `mdq.validator.validate_document`.

    Raises:
        OSError: If `path` cannot be read.
        ParseError: If the source is not valid MDQ.
        MissingField: If a required field (e.g. `stem`, `title`) is
            missing.
        IncompleteQuestion: If a question's type cannot be inferred.
    """

    path = Path(path)
    return parse_any(path.read_text(encoding="utf-8"), loader=loader)


def parse_exam(text: str, loader: QuestionLoader | None = None) -> dict[str, Any]:
    """
    Parse an exam document.

    `include:` blocks are left as `{"include": id}` entries unless a
    `loader` is given, in which case each is resolved to the question
    document it names. Resolution is the loader's business entirely --
    see mdq.loaders.

    Args:
        text: MDQ source text for an exam (i.e. one with an H1 title).
        loader: Resolves an `include:` reference to the question document
            it names. Includes are left unresolved when omitted.

    Returns:
        The parsed exam document, in the shape validated by
        `mdq.validator.validate_document`.

    Raises:
        MissingField: If the exam has no title.
        ParseError: If a question block is not valid MDQ.
        IncompleteQuestion: If a question's type cannot be inferred.
        IncludeNotFound: If `loader` cannot resolve an `include:`
            reference.

    Example:
        >>> exam = parse_exam(
        ...     "# Sample Exam\\n\\n===\\n\\nWhat is 2 + 2?\\n\\n"
        ...     "* [x] 4\\n* [ ] 5\\n"
        ... )
        >>> exam["title"]
        'Sample Exam'
        >>> len(exam["questions"])
        1
    """

    # FIXME: move this logic to the MDQParser and reuse their methods
    frontmatter_text, body = _split_frontmatter(text)
    front: dict[str, Any] = {}
    if frontmatter_text is not None:
        front = _load_frontmatter_yaml(frontmatter_text)

    doc: dict[str, Any] = {"type": "exam"}

    lines = body.splitlines()
    heading: str | None = None
    title_index = 0
    for title_index, line in enumerate(lines):
        if m := H1_RE.match(line):
            heading = m.group("rest")
            break
    if heading is None:
        raise MissingField("title")

    slug_match = SLUG_PREFIX_RE.match(heading)
    if slug_match:
        doc["id"] = slug_match.group("slug")
        heading = heading[slug_match.end() :].strip()
    if heading:
        doc["title"] = heading

    # The frontmatter wins over the H1 for both fields it can also carry.
    for key in (
        "id",
        "title",
        "uuid",
        "course",
        "author",
        "locale",
        "meta",
        "penalty",
    ):
        if key in front:
            doc[key] = str(front[key]) if key == "id" else front[key]
    if "tags" in front:
        doc["tags"] = _normalize_tags(front["tags"])

    instructions, blocks = _split_exam_blocks(lines[title_index + 1 :])
    if instructions:
        doc["instructions"] = instructions

    questions: list[dict[str, Any]] = []
    for position, block in enumerate(blocks, start=1):
        questions.append(_parse_exam_block(block, position, doc, loader))
    doc["questions"] = questions

    return doc


def parse_question(text: str) -> dict[str, Any]:
    """
    Parse MDQ Markdown source into a question document dict, matching the
    shape validated by mdq.validator.validate_document.

    Args:
        text: MDQ source text for a single question, with or without YAML
            frontmatter.

    Returns:
        The parsed question document, in the shape validated by
        `mdq.validator.validate_document`.

    Raises:
        MissingField: If the question has no stem.
        ParseError: If the body does not match any known question shape.
        IncompleteQuestion: If a bracket-list body's type cannot be
            inferred and none is declared in frontmatter.

    Example:
        >>> doc = parse_question(
        ...     "What is the capital of Brazil?\\n\\n"
        ...     "* [ ] Rio de Janeiro\\n* [x] Brasília\\n"
        ... )
        >>> doc["stem"]
        'What is the capital of Brazil?'
        >>> doc["type"]
        'multiple-selection'
    """

    return MDQParser(text).parse_question()


def is_exam(text: str) -> bool:
    """
    Report whether `text` is an exam rather than a single question.

    An exam is recognized by its H1 title, which a question document can
    never carry: generic.md lists H1 headings among the block elements a
    question's preamble rejects.

    Args:
        text: MDQ source text, with or without YAML frontmatter.

    Returns:
        True if `text` has a top-level (H1) heading, False otherwise.

    Example:
        >>> is_exam("# Sample Exam\\n\\nWhat is 2 + 2?")
        True
        >>> is_exam("What is 2 + 2?\\n\\n* [x] 4\\n* [ ] 5")
        False
    """

    _, body = _split_frontmatter(text)
    for line in body.splitlines():
        if H1_RE.match(line):
            return True
    return False


def reconstruct_blocks(src: str) -> list[tuple[str, str]]:
    """
    Parse `src` as a standalone sequence of top-level Markdown blocks and
    reconstruct each one exactly as it would read after being embedded in
    a full MDQ document and parsed back out.

    This is `MDQParser.raw_text`, applied to every top-level block `src`
    parses into: a plain paragraph's soft-wrapped lines collapse to
    single spaces, while a list, blockquote, heading or code block is
    reproduced byte-for-byte. It exists so `mdq.models` can canonicalize
    a `preamble`/`epilogue`/`stem` field into the fixed point a
    render-then-parse round trip actually produces, using the parser's
    own reconstruction rules instead of a second, drifting copy of them.

    Args:
        src: Markdown source for a preamble, epilogue, or stem -- a
            sequence of block elements with no YAML frontmatter of its
            own (a bare `---` at the very start would be misread as one,
            but no MDQ block legitimately starts with a thematic break).

    Returns:
        One `(node_type, text)` pair per top-level block found in `src`,
        in source order.
    """

    reader = MDQParser(src)
    return [(node.type, reader.raw_text(node)) for node in reader.children]


#
# Implementation
#
@dataclass(slots=True)
class RawChoice:
    value: str
    explicit_id: str | None
    text: str
    feedback: str | None = None
    comment: str | None = None


@dataclass
class MDQParser:
    """
    A recursive-descent parser for one MDQ question document.

    Holds a cursor (`children`/`lines`/`pos`) over the question's
    markdown-it block tree, the parsed frontmatter (`front`/`comment`),
    and the output document being built up (`doc`). Grammar-rule methods
    read from the cursor and write into `doc` as they go, which avoids
    threading `(children, lines, index, front, doc)` through a long chain
    of free functions.

    Attributes:
        frontmatter: The question's parsed YAML frontmatter.
        comment: The leading `#`-comment block from the frontmatter, if any.
        children: The body's top-level markdown-it block nodes.
        lines: The body's raw source lines, indexed by `node.map`.
        pos: Index of the next unread node in `children`.
        doc: The output document being assembled.
    """

    src: str

    #: Position in the token stream.
    pos: int = field(default=0, init=False)

    #: Accumulate the currently parsed object
    state: dict[str, Any] = field(default_factory=dict, init=False)

    #: Frontmatter for the current element
    frontmatter: dict[str, Any] = field(default_factory=dict, init=False)

    #: Frontmatter comment
    comment: str | None = field(default=None, init=False)

    #: Unprocessed md nodes.
    children: list[Node] = field(default_factory=list, init=False)

    #: File lines as strings. For rendering back to text.
    lines: list[str] = field(default_factory=list, init=False)

    def __post_init__(self) -> None:
        frontmatter_text, body_text = _split_frontmatter(self.src)
        if frontmatter_text is not None:
            self.frontmatter = _load_frontmatter_yaml(frontmatter_text)
            self.comment = _extract_comment(frontmatter_text)
        else:
            self.frontmatter = {}
            self.comment = None

        tokens = md.parse(body_text)
        self.children = list(Node(tokens).children)
        self.lines = body_text.splitlines()

    #
    # Cursor primitives
    #
    def read(self) -> Node:
        """
        Consume and return the current node, advancing the cursor.

        Raises:
            ParseError: If the cursor is already exhausted.
        """

        node = self.seek()
        if node is None:
            raise ParseError("unexpected end of document")
        self.pos += 1
        return node

    def seek(self) -> Node | None:
        """
        Return the current node without consuming it, or None at the end.

        Despite the name, this is a non-consuming peek at the cursor's
        current position, not a `file.seek`-style jump to an arbitrary one.
        """

        if self.pos >= len(self.children):
            return None
        return self.children[self.pos]

    def expect(self, node_type: str, error_msg: str) -> Node:
        """
        Consume and return the current node if it has type `node_type`.

        Raises:
            ParseError: If the cursor is exhausted or the current node's
                type does not match `node_type`.
        """

        node = self.seek()
        if node is None or node.type != node_type:
            raise ParseError(error_msg, node)
        return self.read()

    def at_end(self) -> bool:
        """True once every child node has been consumed."""

        return self.pos >= len(self.children)

    #
    # Line/text reconstruction
    #
    def raw_lines(self, node: Node) -> list[str]:
        if node.map is None:
            return []
        start, end = node.map
        return self.lines[start:end]

    def raw_text(self, node: Node) -> str:
        """
        Reconstruct a block's text like the original source.

        Prefer the block's inline child's `.content`: it is markdown-it's
        own raw-source text for the block with the block-level markup
        (heading `#`s, list markers, blockquote `>`s) already peeled off,
        which is more reliable than re-slicing lines ourselves for
        anything but a plain paragraph.
        """

        if node.children and node.children[0].type == "inline":
            return node.children[0].content.replace("\n", " ")
        lines = self.raw_lines(node)
        # markdown-it's `.map` for a list (bullet or ordered) that is not
        # the last block in the document extends one line past the list's
        # own content, into the blank line that follows it -- see the
        # module docstring's note on trusting `.map` for line ranges.
        # Trailing blank lines are never part of a block's own content, so
        # dropping them is always correct, not just for lists -- verified
        # this is a no-op (never trims real content) for a fenced code
        # block, whose `.map` always ends on its own closing ` ``` ` line,
        # and for an indented code block, whose `.map` always ends on its
        # last indented line, even when either has a blank line before
        # the end of its own body.
        while lines and not lines[-1].strip():
            lines.pop()
        return "\n".join(lines)

    def join_blocks(self, nodes: list[Node]) -> str | None:
        if not nodes:
            return None
        return "\n\n".join(self.raw_text(n) for n in nodes)

    #
    # Frontmatter
    #

    def apply_common_frontmatter(self) -> None:
        front = self.frontmatter
        doc = self.state
        if front.get("id") is not None:
            doc["id"] = str(front["id"])
        if "uuid" in front:
            doc["uuid"] = front["uuid"]
        if "title" in front:
            doc["title"] = front["title"]
        if "author" in front:
            doc["author"] = front["author"]
        if "locale" in front:
            doc["locale"] = front["locale"]
        if "tags" in front and front["tags"] is not None:
            doc["tags"] = _normalize_tags(front["tags"])
        if "meta" in front:
            doc["meta"] = front["meta"]
        if "weight" in front:
            doc["weight"] = front["weight"]

    #
    # Body-start / tag detection
    #
    def is_bracket_list(self, node: Node) -> bool:
        if node.type != "bullet_list":
            return False
        for item in node.children:
            first_line = self.raw_lines(item)[0] if item.map else ""
            if not BRACKET_ITEM_RE.match(first_line):
                return False
        return bool(node.children)

    def find_body_start(self) -> int:
        """
        Return the index of the first body node in `self.children`.

        Scans from the start of the document (independent of `self.pos`,
        which is still 0 at call time) for the first paragraph matching a
        known body tag, or the first bracket-led bullet list.

        Raises:
            MissingField: If no body node is found.
        """

        for i, child in enumerate(self.children):
            if child.type == "paragraph":
                text = self.raw_text(child)
                if _matches_tag(text):
                    return i
            elif self.is_bracket_list(child):
                return i
        raise MissingField("body")

    #
    # Intro / stem / preamble
    #
    def split_intro(
        self, intro_blocks: list[Node]
    ) -> tuple[str, str | None, str | None]:
        """
        Split the blocks preceding the body into (stem, preamble, slug).

        The stem is the last intro block; everything before it is the
        preamble. An inline `[slug]` prefix, if present, only ever
        appears on the *first* intro block -- which is the stem itself
        when there's no preamble, and the preamble's first block
        otherwise, in which case the stem is untouched.
        """

        stem_node = intro_blocks[-1]
        preamble_blocks = intro_blocks[:-1]

        first_node = intro_blocks[0]
        first_text = self.raw_text(first_node)
        slug_match = (
            SLUG_PREFIX_RE.match(first_text) if first_node.type == "paragraph" else None
        )
        inline_slug = None
        if slug_match:
            inline_slug = slug_match.group("slug")
            stripped_first_text = first_text[slug_match.end() :]
            stem_text = (
                stripped_first_text
                if first_node is stem_node
                else self.raw_text(stem_node)
            )
        else:
            stem_text = self.raw_text(stem_node)

        preamble_text = None
        if preamble_blocks:
            if slug_match and preamble_blocks[0] is first_node:
                preamble_text = "\n\n".join(
                    [first_text[slug_match.end() :]]
                    + [self.raw_text(n) for n in preamble_blocks[1:]]
                )
            else:
                preamble_text = self.join_blocks(preamble_blocks)

        return stem_text, preamble_text, inline_slug

    #
    # Choice/item-list parsing
    #
    def parse_item_list(self, node: Node) -> list[RawChoice]:
        raw_lines = self.raw_lines(node)
        return [self.parse_item(item) for item in _split_list_items(raw_lines)]

    def parse_item(self, item_lines: list[str]) -> RawChoice:
        value, explicit_id, rest = parse_marker(item_lines[0])

        text_lines = [rest] if rest.strip() else []
        feedback_lines: list[str] = []
        comment_lines: list[str] = []
        mode = "text"

        for line in item_lines[1:]:
            stripped = line.strip()
            if stripped.startswith(">"):
                mode = "feedback"
                feedback_lines.append(stripped[1:].strip())
            elif stripped.startswith("!"):
                mode = "comment"
                comment_lines.append(stripped[1:].strip())
            elif mode == "text":
                text_lines.append(stripped)
            elif mode == "feedback":
                feedback_lines.append(stripped)
            else:
                comment_lines.append(stripped)

        choice = RawChoice(value, explicit_id, " ".join(t for t in text_lines if t))
        if feedback_lines:
            choice.feedback = " ".join(feedback_lines)
        if comment_lines:
            choice.comment = " ".join(comment_lines)
        return choice

    #
    # Per-type body fillers
    #
    def parse_choice_body(
        self, question_type: str, raw_choices: list[RawChoice]
    ) -> None:
        ids = _assign_choice_ids(raw_choices)
        choices = []
        for choice, choice_id in zip(raw_choices, ids):
            entry: dict[str, Any] = {"id": choice_id, "text": choice.text}
            if question_type == "multiple-choice":
                # Always explicit (see multiple-choice/simple.yaml): score
                # is emitted even when 0, not just for correct/partial
                # choices.
                entry["score"] = _score_from_value(choice.value)
            elif question_type == "multiple-selection":
                if choice.value.lower() == "x":
                    entry["correct"] = True
            elif question_type == "true-false":
                letter = choice.value
                # TRUE and PROVISIONAL letters both mean true; only FALSE
                # letters mean false (docs/question-types/true-false.md).
                entry["correct"] = letter.lower() not in FALSE_LETTERS
                if letter:
                    entry["marker"] = letter
            if choice.feedback:
                entry["feedback"] = choice.feedback
            if choice.comment:
                entry["comment"] = choice.comment
            choices.append(entry)
        self.state["choices"] = choices

    def parse_essay_body(self) -> None:
        front = self.frontmatter
        if "input" in front:
            self.state["input"] = front["input"]
        if "highlight" in front:
            self.state["highlight"] = front["highlight"]

    def parse_short_answer_body(self, tag_text: str) -> None:
        m = SHORT_ANSWER_RE.match(tag_text)
        assert m
        rest = m.group("rest").strip()

        value: str | None = None
        values: list[str] | None = None
        if rest:
            value = rest
        else:
            node = self.seek()
            if node is not None and node.type == "bullet_list":
                self.read()
                raw_lines = self.raw_lines(node)
                values = [
                    " ".join(_strip_list_marker(line) for line in item)
                    for item in _split_list_items(raw_lines)
                ]

        front = self.frontmatter
        doc = self.state
        if "exact" in front:
            doc["exact"] = front["exact"]
        if "openEnded" in front:
            doc["openEnded"] = front["openEnded"]

        regex = front.get("regex")
        if (
            regex is None
            and value
            and value.startswith("/")
            and value.endswith("/")
            and len(value) >= 2
        ):
            regex = value[1:-1]
            value = None

        if regex is not None:
            doc["regex"] = regex
        elif values is not None:
            doc["oneOf"] = values
        elif value is not None:
            doc["oneOf"] = [value]
        elif "oneOf" not in doc and "regex" not in doc and "openEnded" not in doc:
            doc["openEnded"] = True

    def parse_numeric_body(self, tag_text: str) -> None:
        m = NUMERIC_TAG_RE.match(tag_text)
        assert m
        unit = m.group("unit")
        parsed = _parse_numeric_expression(m.group("rest"))
        front = self.frontmatter
        doc = self.state

        doc["answer"] = parsed["answer"]
        if unit and "unit" not in front:
            doc["unit"] = unit
        if "domain" in front:
            doc["domain"] = front["domain"]
        elif "domain" in parsed:
            doc["domain"] = parsed["domain"]
        if "decimalPlaces" in front:
            doc["decimalPlaces"] = front["decimalPlaces"]
        elif "decimalPlaces" in parsed:
            doc["decimalPlaces"] = parsed["decimalPlaces"]
        if "unit" in front:
            doc["unit"] = front["unit"]
        if "tolerance" in parsed:
            doc["tolerance"] = parsed["tolerance"]

    def parse_fill_in_body(self, tag_text: str) -> None:
        front = self.frontmatter
        if "shuffle" in front:
            self.state["shuffle"] = front["shuffle"]

        blanks: list[dict[str, Any]] = []
        text = tag_text
        while True:
            m = BLANK_RE.match(text)
            if not m:
                break
            blank_id = m.group("id")
            blank_type = m.group("type")
            rest = m.group("rest").strip()

            next_node = self.seek()
            if (
                blank_type is None
                and not rest
                and next_node is not None
                and next_node.type == "bullet_list"
            ):
                self.read()
                raw_choices = self.parse_item_list(next_node)
                ids = _assign_choice_ids(raw_choices)
                choices = []
                for choice, choice_id in zip(raw_choices, ids):
                    entry: dict[str, Any] = {"id": choice_id, "text": choice.text}
                    score = _score_from_value(choice.value)
                    if score:
                        entry["score"] = score
                    if choice.feedback:
                        entry["feedback"] = choice.feedback
                    if choice.comment:
                        entry["comment"] = choice.comment
                    choices.append(entry)
                blanks.append(
                    {"id": blank_id, "type": "multiple-choice", "choices": choices}
                )
            elif blank_type == "numeric":
                parsed = _parse_numeric_expression(rest)
                # A numeric blank is graded exactly like a numeric
                # question (fill-in.md), so the domain is inferred from
                # the written representation there too.
                blank: dict[str, Any] = {
                    "id": blank_id,
                    "type": "numeric",
                    "answer": parsed["answer"],
                }
                for key in ("domain", "decimalPlaces", "tolerance"):
                    if key in parsed:
                        blank[key] = parsed[key]
                blanks.append(blank)
            elif blank_type == "short-answer":
                if rest.startswith("/") and rest.endswith("/") and len(rest) >= 2:
                    blanks.append(
                        {"id": blank_id, "type": "short-answer", "regex": rest[1:-1]}
                    )
                else:
                    blanks.append(
                        {"id": blank_id, "type": "short-answer", "oneOf": [rest]}
                    )
            else:
                raise ParseError(f"unrecognized blank definition: {text!r}")

            node = self.seek()
            if node is None or node.type != "paragraph":
                break
            text = self.raw_text(node)
            if not BLANK_RE.match(text):
                break
            self.read()

        self.state["blanks"] = blanks

    def parse_answer_key(self) -> list[Node]:
        """
        Look for the optional `## [answer-key]` section among the
        remaining nodes. Only ever called for essay questions -- other
        types have no answer-key syntax and epilogue swallows everything
        after their body verbatim.

        Returns:
            The nodes that should still be treated as epilogue (i.e.
            everything before the heading, if one was found, or all
            remaining nodes otherwise). Does not advance `self.pos`.
        """

        remaining = self.children[self.pos :]
        for i, node in enumerate(remaining):
            if node.type == "heading" and node.tag == "h2":
                text = self.raw_text(node)
                if ANSWER_KEY_RE.match(text):
                    answer_blocks = remaining[i + 1 :]
                    answer_text = self.join_blocks(answer_blocks)
                    if answer_text:
                        self.state["answerKey"] = answer_text
                    return remaining[:i]
        return remaining

    def apply_type_specific_frontmatter(self, question_type: str) -> None:
        if question_type in ("multiple-choice", "multiple-selection", "fill-in"):
            if "shuffle" in self.frontmatter and "shuffle" not in self.state:
                self.state["shuffle"] = self.frontmatter["shuffle"]

    #
    # Main driver
    #
    def parse_question(self) -> dict[str, Any]:
        """
        Parse the question document this instance was constructed with.

        Raises:
            MissingField: If the question has no stem.
            ParseError: If the body does not match any known question
                shape.
            IncompleteQuestion: If a bracket-list body's type cannot be
                inferred and none is declared in frontmatter.
        """

        if self.comment:
            self.state["comment"] = self.comment
        self.apply_common_frontmatter()

        if not self.children:
            raise MissingField("stem")

        body_start = self.find_body_start()
        if body_start == 0:
            raise MissingField("stem")

        intro_blocks = [self.read() for _ in range(body_start)]
        stem_text, preamble_text, inline_slug = self.split_intro(intro_blocks)

        if "id" not in self.state and inline_slug:
            self.state["id"] = inline_slug
        if preamble_text:
            self.state["preamble"] = preamble_text
        self.state["stem"] = stem_text

        question_type = self.frontmatter.get("type")
        node = self.seek()
        assert node is not None

        if node.type == "bullet_list":
            # Ambiguous between multiple-choice / multiple-selection /
            # true-false: infer from the bracket values unless declared.
            body_node = self.expect("bullet_list", "malformed choice list")
            raw_choices = self.parse_item_list(body_node)
            values = [c.value for c in raw_choices]
            question_type = question_type or _infer_choice_type(values)
            if not question_type:
                raise IncompleteQuestion()
            self.parse_choice_body(question_type, raw_choices)
        else:
            body_node = self.expect("paragraph", "unrecognized question body")
            text = self.raw_text(body_node)
            tag = _matches_tag(text)
            if tag == "essay":
                question_type = question_type or "essay"
                self.parse_essay_body()
            elif tag == "short-answer":
                question_type = question_type or "short-answer"
                self.parse_short_answer_body(text)
            elif tag == "numeric":
                question_type = question_type or "numeric"
                self.parse_numeric_body(text)
            elif tag == "blank":
                question_type = question_type or "fill-in"
                self.parse_fill_in_body(text)
            else:  # pragma: no cover - find_body_start already filtered this
                raise IncompleteQuestion()

        self.state["type"] = question_type

        epilogue_blocks = (
            self.parse_answer_key()
            if question_type == "essay"
            else self.children[self.pos :]
        )
        if epilogue_blocks:
            epilogue_text = self.join_blocks(epilogue_blocks)
            if epilogue_text:
                self.state["epilogue"] = epilogue_text

        self.apply_type_specific_frontmatter(question_type)

        return self.state


#
# Slugs and choice ids
#
def _fold_ascii(text: str) -> str:
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")


def _slugify(text: str) -> str:
    folded = _fold_ascii(text).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", folded).strip("-")
    return slug


def _slugify_choice_text(text: str) -> str:
    """
    Derive a url-safe choice id from its text, per
    docs/question-types/multiple-choice.md#choices.
    """

    core = text.strip()
    if len(core) >= 2 and core[0] == "`" and core[-1] == "`" and core.count("`") == 2:
        core = core[1:-1]
    if len(core) == 1:
        if core in SYMBOL_NAMES:
            return SYMBOL_NAMES[core]
        if core in DIGIT_NAMES:
            return DIGIT_NAMES[core]
    return _slugify(text) or "choice"


#
# Frontmatter
#
def _split_frontmatter(text: str) -> tuple[str | None, str]:
    """
    Split source text into (raw frontmatter body, remaining document text).

    Returns (None, text) if there is no frontmatter block at all.
    """

    if not text.startswith("---"):
        return None, text

    lines = text.splitlines(keepends=True)
    if lines[0].rstrip("\r\n") != "---":
        return None, text

    for i in range(1, len(lines)):
        if lines[i].rstrip("\r\n") == "---":
            frontmatter = "".join(lines[1:i])
            rest = "".join(lines[i + 1 :])
            return frontmatter, rest

    # Unterminated frontmatter marker: treat the whole thing as a document
    # with no frontmatter, rather than silently swallowing the file.
    return None, text


def _extract_comment(frontmatter_text: str) -> str | None:
    """
    Pull out the leading `#`-comment block, per the `comment_string` rule
    in docs/question-types/generic.md. A blank line breaks it.
    """

    lines = frontmatter_text.splitlines()
    i = 0
    while i < len(lines) and lines[i].strip() == "":
        i += 1

    comment_lines = []
    while i < len(lines) and lines[i].startswith("#"):
        content = lines[i][1:]
        if content.startswith(" "):
            content = content[1:]
        comment_lines.append(content)
        i += 1

    return " ".join(comment_lines) if comment_lines else None


def _load_frontmatter_yaml(text: str) -> dict[str, Any]:
    data = yaml.safe_load(text)
    return data if isinstance(data, dict) else {}


#
# Body-start detection
#
def _matches_tag(text: str) -> str | None:
    """Return which known body/blank tag `text` looks like, if any."""

    if ESSAY_TAG_RE.match(text):
        return "essay"
    if SHORT_ANSWER_RE.match(text):
        return "short-answer"
    if NUMERIC_TAG_RE.match(text):
        return "numeric"
    if BLANK_RE.match(text):
        return "blank"
    return None


#
# Choice-list parsing (multiple-choice / multiple-selection / true-false /
# fill-in choice blanks)
#
class ParsedMarker(NamedTuple):
    marker: str
    id: str | None
    rest: str


def parse_marker(line: str) -> ParsedMarker:
    """
    Extract a choice item's (value, explicit id, remaining text) from
    its first raw line, e.g. `* [x] [my-id] Some text`.

    Raises:
        ParseError: If `line` does not start with a `* [value]` marker.
    """

    m = ITEM_MARKER_RE.match(line)
    if not m:
        raise ParseError(f"malformed choice item: {line!r}")

    value = m.group("value").strip()
    rest = m.group("rest")

    id = None
    id_match = CHOICE_ID_PREFIX_RE.match(rest)
    if id_match:
        id = id_match.group("id")
        rest = rest[id_match.end() :]

    return ParsedMarker(value, id, rest)


def _strip_list_marker(line: str) -> str:
    """Strip a plain (non-bracket) list item's `* `/`- ` marker."""

    m = PLAIN_ITEM_RE.match(line)
    return m.group("rest").strip() if m else line.strip()


def _split_list_items(item_lines: list[str]) -> list[list[str]]:
    items: list[list[str]] = []
    current: list[str] = []
    for line in item_lines:
        if re.match(r"^[*+-]\s", line):
            current = [line]
            items.append(current)
        else:
            current.append(line)
    return items


def _assign_choice_ids(choices: list[RawChoice]) -> list[str]:
    ids = []
    for choice in choices:
        ids.append(choice.explicit_id or _slugify_choice_text(choice.text))
    return ids


def _infer_choice_type(values: list[str]) -> str | None:
    """
    Infer multiple-choice / multiple-selection / true-false from the
    bracket values used in a choice list, per generic.md's rule that a
    bracket-led list is never valid preamble -- it is always a choice
    body of one of these three kinds.

    A list whose markers are all blank is multiple-selection: nothing is
    marked correct, which multiple-selection allows outright (zero correct
    choices is a legal answer key) but multiple-choice does not.
    """

    for v in values:
        if v == "*" or PERCENT_RE.match(v):
            return "multiple-choice"
    for v in values:
        if v.lower() == "x":
            return "multiple-selection"
    for v in values:
        if v and v.lower() not in ("x",) and len(v) == 1 and v.isalpha():
            return "true-false"
    return "multiple-selection"


def _score_from_value(value: str) -> float | int:
    if value == "*":
        return 1
    if PERCENT_RE.match(value):
        return float(value[:-1]) / 100
    return 0


#
# Numeric body parsing
#
def _parse_numeric_expression(expr: str) -> dict[str, Any]:
    """
    Parse the value/tolerance grammar from docs/question-types/numeric.md
    (`sign? value abstol? reltol?`, order-independent in practice -- see
    numeric/tolerances.mdq.md, which writes the relative tolerance
    first).
    """

    m = NUM_VALUE_RE.match(expr.strip())
    if not m:
        raise ParseError(f"malformed numeric body: {expr!r}")

    sign = -1 if m.group("sign") == "-" else 1
    value_str = m.group("value")

    result: dict[str, Any] = {}
    if "/" in value_str:
        num, den = value_str.split("/")
        result["answer"] = sign * (int(num) / int(den))
        result["domain"] = "fraction"
    elif "." in value_str:
        result["answer"] = sign * float(value_str)
        result["domain"] = "decimal"
        result["decimalPlaces"] = len(value_str.split(".", 1)[1])
    else:
        result["answer"] = sign * int(value_str)
        result["domain"] = "integer"

    tolerance: dict[str, float] = {}
    for tol_match in TOL_TERM_RE.finditer(m.group("tolerances")):
        num = float(tol_match.group("num"))
        if tol_match.group("pct"):
            tolerance["relative"] = num / 100
        else:
            tolerance["absolute"] = num
    if tolerance:
        result["tolerance"] = tolerance

    return result


#
# Generic frontmatter fields
#
def _normalize_tags(tags: Any) -> list[str]:
    """
    generic.md: `tags` is a list, or a single comma-delimited string that
    is split into one. Exams and questions share the rule.
    """
    if isinstance(tags, str):
        return [part.strip() for part in tags.split(",") if part.strip()]
    return list(tags)


#
# Exams
#
def _split_exam_blocks(lines: list[str]) -> tuple[str | None, list[list[str]]]:
    """
    Split the text below the title into (instructions, question blocks).

    A block starts at a `===` separator -- always, unconditionally -- or
    at a bare `---` frontmatter fence. Telling a fence-that-opens-a-new-
    question apart from a thematic break sitting in some other question's
    own preamble/epilogue prose (which generic.md allows outright) can't
    be done by content alone: an entirely ordinary prose line like "Nota:
    leia com atenção." parses as a YAML mapping just as readily as real
    frontmatter fields do, so a bare `---` only opens a *new* question
    when position says it structurally could:

    * it is the very first one found at all -- there is nothing yet to
      confuse it with, and exam.md's Body rule already forbids ordinary
      instructions prose from using a `---`-fenced block, so whatever
      fence is found first, however much instructions prose precedes it,
      is trustworthy; or
    * nothing but blank lines separates it from the line right after a
      *previous bare fence's own closing* `---` (exam.md's worked example
      chains two bare-frontmatter questions exactly this way, back to
      back, with no `===` between them); or
    * the current question (opened by `===` or a previous fence) has
      already shown a recognizable body -- a body tag (`[essay]`,
      `[short-answer]: ...`, `[numeric]: ...`, a `[^blank]:` line) or the
      first item of a bracket-choice list -- since its own frontmatter
      closed. Once that has happened the question is structurally
      complete (only optional epilogue prose can still follow), so a
      further bare fence safely opens the next question even with
      arbitrary epilogue text in between, no `===` required -- this is
      exactly what lets a duplicate-id check span two bare-frontmatter
      essay questions with real bodies, not just empty `include`s.

    A fence immediately after a `===`, with nothing but blank lines
    before it, is none of those: it is simply that question's own
    frontmatter (any question may have one, `===`-opened or not), not a
    second, separate start -- so it is consumed like normal content, not
    recorded as a new block, though a further fence chaining off *its*
    close is fair game again.

    Before any body tag has appeared for the current question, a bare
    `---` is necessarily still inside its own preamble/stem, and no
    signal available from raw lines can tell a thematic break there from
    a genuine fence -- so it is never treated as one.
    """

    starts: list[int] = []
    index = 0
    #: Position right after the most recently accepted block boundary.
    boundary = 0
    #: Whether that boundary was a `===` (as opposed to a previous bare
    #: fence's own closing `---`, or the still-unresolved start of the
    #: instructions region).
    boundary_is_separator = False
    #: Whether the current question has shown a recognizable body tag or
    #: bracket-choice list item since its own frontmatter (if any) closed.
    body_seen = False
    while index < len(lines):
        line = lines[index].rstrip()
        stripped = line.strip()
        blank_before = index == 0 or not lines[index - 1].strip()

        if not body_seen and (
            _matches_tag(stripped) or BRACKET_ITEM_RE.match(stripped)
        ):
            body_seen = True

        if line == SEPARATOR and blank_before:
            starts.append(index)
            boundary = index + 1
            boundary_is_separator = True
            body_seen = False
            index += 1
            continue

        if line == "---" and blank_before:
            adjacent = all(not gap.strip() for gap in lines[boundary:index])
            is_own_frontmatter = boundary_is_separator and adjacent
            is_new_start = not is_own_frontmatter and (
                not starts or adjacent or body_seen
            )
            if is_own_frontmatter or is_new_start:
                # Positionally this candidate is allowed to open a fence;
                # still require the enclosed text to actually look like
                # YAML frontmatter (a cheap secondary guard, never the
                # primary test) before committing to it.
                closing = next(
                    (
                        j
                        for j in range(index + 1, len(lines))
                        if lines[j].rstrip() == "---"
                        and _looks_like_frontmatter(lines[index + 1 : j])
                    ),
                    None,
                )
                if closing is not None:
                    if is_new_start:
                        starts.append(index)
                    boundary = closing + 1
                    boundary_is_separator = False
                    body_seen = False
                    index = closing + 1
                    continue

        index += 1

    if not starts:
        return _clean_block("\n".join(lines)), []

    instructions = _clean_block("\n".join(lines[: starts[0]]))
    bounds = starts + [len(lines)]
    blocks = [lines[bounds[i] : bounds[i + 1]] for i in range(len(starts))]
    return instructions, blocks


def _looks_like_frontmatter(lines: list[str]) -> bool:
    """
    Report whether the lines between a candidate `---` pair parse as a
    YAML mapping, or nothing at all (an empty frontmatter block).

    A cheap secondary guard only: `_split_exam_blocks` decides whether a
    `---` is even eligible to open a fence by *position* first (see its
    docstring); this just keeps a positionally-eligible candidate from
    being treated as frontmatter when its enclosed text plainly isn't
    YAML at all (e.g. a malformed document, or two coincidentally close
    thematic breaks).
    """

    try:
        loaded = yaml.safe_load("\n".join(lines))
    except yaml.YAMLError:
        return False
    return loaded is None or isinstance(loaded, dict)


def _clean_block(text: str) -> str | None:
    stripped = text.strip()
    return stripped or None


def _parse_exam_block(
    lines: list[str],
    position: int,
    exam: dict[str, Any],
    loader: QuestionLoader | None,
) -> dict[str, Any]:
    """Turn one question block into an entry of the exam's `questions`."""

    # Drop a leading `===`; what follows is ordinary question source.
    if lines and lines[0].rstrip() == SEPARATOR:
        lines = lines[1:]

    source = "\n".join(lines).strip("\n")
    frontmatter_text, _ = _split_frontmatter(source + "\n")
    front = _load_frontmatter_yaml(frontmatter_text) if frontmatter_text else {}

    if "include" in front:
        target = str(front["include"])
        if loader is None:
            return {"include": target}
        question = dict(loader.load(target))
        # An include names a question that already has an identity, so it
        # keeps its own id -- falling back to the id it was found by.
        question.setdefault("id", target)
        _inherit_from_exam(question, exam)
        return question

    question = parse_question(source)
    question.setdefault("id", f"q{position}")
    _inherit_from_exam(question, exam)
    return question


def _inherit_from_exam(question: dict[str, Any], exam: dict[str, Any]) -> None:
    """A question takes the exam's locale and author when it names none."""
    for field in INHERITED_FIELDS:
        if field not in question and field in exam:
            question[field] = exam[field]
