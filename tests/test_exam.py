"""
Exam documents: recognition, block splitting, include resolution, and the
inheritance and numbering rules from docs/exam.md.
"""

from __future__ import annotations

import pytest

from mdq.loaders import DictLoader, FileLoader, IncludeNotFound, QuestionLoader
from mdq.parser import is_exam, parse_any, parse_file
from mdq.testing import VALID_DIR, parsed_sibling
from mdq.validator import load_document, validate_document

MIDTERM = VALID_DIR / "exam" / "midterm.mdq.md"

MINIMAL = """# [ex] Exam

===

What is the capital of Brazil?

* [ ] Lisbon
* [*] Brasília
"""


def _rules(warnings) -> set[str]:
    return {w.rule for w in warnings}


# ---------------------------------------------------------------------
# recognition
# ---------------------------------------------------------------------


def test_h1_marks_an_exam() -> None:
    assert is_exam(MINIMAL)


def test_a_question_is_not_an_exam() -> None:
    """A question can never carry an H1, which is what makes the H1 a
    reliable discriminator."""
    assert not is_exam("Explain recursion.\n\n[essay]\n")


def test_h1_after_frontmatter_still_marks_an_exam() -> None:
    assert is_exam("---\ncourse: CS101\n---\n\n# Exam\n")


def test_parse_dispatches_on_kind() -> None:
    assert parse_any(MINIMAL)["type"] == "exam"
    assert parse_any("Explain recursion.\n\n[essay]\n")["type"] == "essay"


# ---------------------------------------------------------------------
# the worked example
# ---------------------------------------------------------------------


def test_midterm_matches_its_fixture() -> None:
    assert parse_file(MIDTERM) == load_document(parsed_sibling(MIDTERM))


def test_midterm_validates() -> None:
    assert validate_document(parse_file(MIDTERM)).valid


def test_title_and_slug_come_from_the_h1() -> None:
    doc = parse_file(MIDTERM)
    assert doc["id"] == "midterm"
    assert doc["title"] == "Midterm Exam"


def test_frontmatter_beats_the_h1() -> None:
    doc = parse_any("---\nid: from-front\ntitle: Front\n---\n\n# [from-h1] H1 Title\n")
    assert doc["id"] == "from-front"
    assert doc["title"] == "Front"


def test_instructions_are_the_text_before_the_first_question() -> None:
    assert parse_file(MIDTERM)["instructions"] == (
        "Answer every question. You have two hours."
    )


# ---------------------------------------------------------------------
# block splitting
# ---------------------------------------------------------------------


def test_both_block_forms_are_recognized() -> None:
    """A question begins at a `===` separator or at its own frontmatter."""
    doc = parse_file(MIDTERM)
    assert len(doc["questions"]) == 3


def test_separator_needs_a_blank_line_before_it() -> None:
    """Without one, CommonMark reads `===` as a setext underline and turns
    the paragraph above into an H1 -- which is exam-title syntax."""
    exam = parse_any("# Exam\n\nJudge this\n===\n\nmore text\n")
    assert exam["questions"] == []


def test_exam_with_no_questions_parses_and_warns() -> None:
    doc = parse_any("# [empty] Draft Exam\n\nStill being written.\n")
    assert doc["questions"] == []
    result = validate_document(doc)
    assert result.valid
    assert "exam-without-questions" in _rules(result.warnings)


def test_duplicate_question_ids_warn() -> None:
    doc = parse_any(
        "# Exam\n\n---\nid: dup\n---\n\nFirst.\n\n[essay]\n\n"
        "---\nid: dup\n---\n\nSecond.\n\n[essay]\n"
    )
    assert "duplicate-question-id" in _rules(validate_document(doc).warnings)


# ---------------------------------------------------------------------
# implicit ids
# ---------------------------------------------------------------------


def test_questions_without_an_id_are_numbered_by_position() -> None:
    doc = parse_any(MINIMAL)
    assert doc["questions"][0]["id"] == "q1"


def test_an_include_occupies_a_position() -> None:
    """exam.md: the implicit id matches the position the student sees, so
    an include in slot 1 makes the next question q2."""
    doc = parse_file(MIDTERM)
    ids = [q.get("include") or q["id"] for q in doc["questions"]]
    assert ids == ["recursion-01", "factorial", "q3"]


def test_a_declared_id_is_kept() -> None:
    assert parse_file(MIDTERM)["questions"][1]["id"] == "factorial"


# ---------------------------------------------------------------------
# inheritance
# ---------------------------------------------------------------------


def test_questions_inherit_locale_and_author() -> None:
    question = parse_file(MIDTERM)["questions"][1]
    assert question["locale"] == "pt-BR"
    assert question["author"] == "Fábio Macêdo Mendes"


def test_a_question_keeps_its_own_locale() -> None:
    doc = parse_any(
        "---\nlocale: pt-BR\n---\n\n# Exam\n\n---\nlocale: en\n---\n\n"
        "Explain X.\n\n[essay]\n"
    )
    assert doc["questions"][0]["locale"] == "en"


def test_tags_are_not_inherited() -> None:
    doc = parse_any(
        "---\ntags: [midterm, cs101]\n---\n\n# Exam\n\n===\n\nExplain X.\n\n[essay]\n"
    )
    assert doc["tags"] == ["midterm", "cs101"]
    assert "tags" not in doc["questions"][0]


def test_course_is_not_inherited() -> None:
    doc = parse_any(
        "---\ncourse: CS101\n---\n\n# Exam\n\n===\n\nExplain X.\n\n[essay]\n"
    )
    assert "course" not in doc["questions"][0]


# ---------------------------------------------------------------------
# include resolution
# ---------------------------------------------------------------------


def test_includes_are_unresolved_without_a_loader() -> None:
    """An exam whose includes have not been resolved is still well-formed;
    where a question lives is the host's business."""
    doc = parse_file(MIDTERM)
    assert doc["questions"][0] == {"include": "recursion-01"}
    assert validate_document(doc).valid


def test_file_loader_resolves_an_include() -> None:
    doc = parse_file(MIDTERM, loader=FileLoader(MIDTERM.parent))
    resolved = doc["questions"][0]
    assert resolved["type"] == "essay"
    assert resolved["title"] == "Base cases"
    assert validate_document(doc).valid


def test_file_loader_searches_subdirectories() -> None:
    """recursion-01 lives in exam/bank/, not beside the exam itself."""
    loader = FileLoader(MIDTERM.parent)
    assert loader.load("recursion-01")["id"] == "recursion-01"


def test_file_loader_can_be_restricted_to_its_root() -> None:
    with pytest.raises(IncludeNotFound):
        FileLoader(MIDTERM.parent, recursive=False).load("recursion-01")


def test_a_resolved_include_keeps_its_own_id() -> None:
    """It names a question that already has an identity, so the exam's
    positional numbering never renames it."""
    doc = parse_file(MIDTERM, loader=FileLoader(MIDTERM.parent))
    assert doc["questions"][0]["id"] == "recursion-01"


def test_a_resolved_include_inherits_from_the_exam() -> None:
    doc = parse_file(MIDTERM, loader=FileLoader(MIDTERM.parent))
    assert doc["questions"][0]["locale"] == "pt-BR"


def test_an_unresolvable_include_raises() -> None:
    with pytest.raises(IncludeNotFound) as excinfo:
        parse_file(MIDTERM, loader=DictLoader({}))
    assert excinfo.value.question_id == "recursion-01"


def test_any_object_with_load_is_a_loader() -> None:
    """The parser depends on the protocol, not on FileLoader."""

    class Bank:
        def load(self, question_id: str) -> dict:
            return {"type": "essay", "stem": f"Question {question_id}."}

    assert isinstance(Bank(), QuestionLoader)
    doc = parse_file(MIDTERM, loader=Bank())
    assert doc["questions"][0]["stem"] == "Question recursion-01."
