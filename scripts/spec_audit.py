# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "PyYAML>=6.0",
#   "jsonschema>=4.18",
#   "lark>=1.1",
#   "markdown-it-py>=3.0",
#   "mdit-py-plugins>=0.4",
# ]
# ///
"""
Audit the consistency of the specification: the schemas, the documents in
`docs/`, the "Additional Rules" tables, `docs/lint-codes.md` and the example
corpus.

The audit first regenerates the schema bundle with `scripts/schema_bundle.py`
(step 0), so the later steps and the implementations see fresh copies. With
`--check` it writes nothing and fails if a copy is stale.

Then it runs these steps in order and reports every problem it finds:

1. Every `schema/*.yaml` is valid YAML and a valid JSON Schema, and each
   document in `docs/question-types/` (and `docs/exam.md`) has a schema.
2. Every Markdown file in `docs/` has consistent headings, valid internal
   links and anchors, closed code fences, regular tables and matched
   footnotes.
3. The files of `examples/valid/` are complete: each `.mdq.md` has its
   `.yaml`, each `.lint.json` belongs to a document, and no valid example
   reports an `error`. The lint codes are collected for steps 5 and 7.
4. Each question type and `exam.md` has a `## Additional Rules` section with
   a `Field | Level | Code | Rule` table, and each code has one level. The
   codes are collected.
5. The lint codes of the valid corpus agree with the tables of step 4.
6. The tables of `docs/lint-codes.md` agree with the tables of step 4, and
   list each code once.
7. The files of `examples/invalid/` are complete, every code they report is
   declared, and every `critical` code has an invalid example.
8. The `## Frontmatter` table of each question type and of `exam.md` agrees
   with its schema: every field is a property, the `type` row matches the
   schema `const`, the Type column matches the schema type, and every schema
   property is in the table or mentioned in the text.
9. The `Field` column of each "Additional Rules" table refers to paths that
   exist in the schema of the document.
10. A property name has the same type in every schema that defines it, and
    property names are camelCase.
11. Every code fence of `docs/` is a top-level `md`, `json`, `yaml` or `lark`
    block. `json` and `yaml` blocks parse, and `lark` blocks compile as Lark
    grammars, with stubs for the rules and terminals they leave undefined.
12. Every path of a `.lint.json` file resolves in the document of its example.
13. The reference implementation agrees with the schemas: `mdq-py`'s
    `tests/test_schema_agreement.py` passes. The step is skipped, not failed,
    if `mdq-py/` is not in the checkout.

Run it from the repository root with `uv run scripts/spec_audit.py`.
`--fail-fast` stops at the first step that fails. A step that fails still
feeds the steps after it with the data it could collect. A skipped step is
not a failure.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import Any, Callable

import lark
import yaml
from jsonschema.exceptions import SchemaError
from jsonschema.validators import validator_for
from markdown_it import MarkdownIt
from markdown_it.token import Token
from mdit_py_plugins.footnote import footnote_plugin

#: Root of the mdq-spec checkout.
MDQ_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = MDQ_ROOT / "docs"
QUESTION_TYPES_DIR = DOCS_DIR / "question-types"
EXAM_DOC = DOCS_DIR / "exam.md"
LINT_CODES_DOC = DOCS_DIR / "lint-codes.md"
SCHEMA_DIR = MDQ_ROOT / "schema"
VALID_DIR = MDQ_ROOT / "examples" / "valid"
INVALID_DIR = MDQ_ROOT / "examples" / "invalid"

SOURCE_SUFFIX = ".mdq.md"
LINT_SUFFIX = ".lint.json"
RESOLVED_SUFFIX = ".resolved.yaml"
DOCUMENT_SUFFIXES = (SOURCE_SUFFIX, ".yaml", ".json")

SEVERITIES = ("error", "warning", "info")
#: The "Level" column of an "Additional Rules" table, mapped to the severity
#: of the diagnostic.
LEVELS = {"critical": "error", "warning": "warning", "info": "info"}
RULES_HEADER = ["Field", "Level", "Code", "Rule"]
LINT_TABLE_HEADER = ["Code", "Severity", "Question types", "Description"]
ERROR_TABLE_HEADER = ["Code", "Question types", "Description"]
FRONTMATTER_HEADER = ["Field", "Type", "Description"]
BASE_SCHEMA = "question-base"
#: The type names of the Type column of a frontmatter table that are JSON
#: Schema types, and the ones that are aliases of them.
JSON_TYPES = {"string", "integer", "number", "boolean", "object", "array", "null"}
TYPE_ALIASES = {"map": "object"}

CODE_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

#: Declared codes that no corpus example can report, with the reason.
NO_CORPUS_EXAMPLE = {
    "empty-include-all": "only Exam.resolve reports it, never load",
}

#: Frontmatter fields that the table documents with a shorthand the schema
#: does not describe, as (doc stem, field) with the reason. The table
#: describes the frontmatter and the schema describes the AST.
FRONTMATTER_SHORTHANDS = {
    ("question-base", "tags"): "comma-delimited string shorthand",
    ("exam", "tags"): "comma-delimited string shorthand",
    ("fill-in", "preAccept"): "map shorthand, a field of each blank in the AST",
    ("fill-in", "preReject"): "map shorthand, a field of each blank in the AST",
    ("question-base", "type"): "each question type schema declares its own",
}

#: Values of the "Field" column of an "Additional Rules" table that are not
#: schema paths, with the reason.
PSEUDO_FIELDS = {
    "body": "the Markdown body of the document, not a frontmatter key",
    "any frontmatter key": "stands for every key of the frontmatter",
    "any text": "stands for every piece of text of the document",
}

#: Property names that several schemas define with different types, with the
#: reason.
POLYMORPHIC_PROPERTIES: dict[str, str] = {
    "grading": "the exam also accepts a map from question type to strategy",
    "accept": "ordering lists alternative orderings (objects), short-answer "
    "and fill-in blanks list patterns (string or object)",
    "reject": "ordering lists alternative orderings (objects), short-answer "
    "and fill-in blanks list patterns (string or object)",
}

#: Property names that are not camelCase on purpose, with the reason.
NAMING_EXCEPTIONS: dict[str, str] = {
    "include-all": "pending decision: deliberate kebab-case key of an include block",
}

#: Literal that questions accept for `grading` and `shuffle`, to take the value
#: of the exam. The exam is the top of the chain, so its schema lacks it.
INHERIT = "inherit"

#: Pattern of a property name.
CAMEL_CASE_RE = re.compile(r"^[a-z][a-zA-Z0-9]*$")

#: Info string languages that a code fence of `docs/` may use. Use `md`, not
#: `markdown`.
FENCE_LANGUAGES = ("md", "json", "yaml", "lark")

#: Lark errors that report a name used but not defined, for a rule or a
#: terminal (lark reports an undefined terminal used in a rule as a rule).
UNDEFINED_RE = re.compile(
    r"^(?:Rule|Terminal|Template) '(\w+)' used but not defined"
    r"|^Terminal used but not defined: (\w+)"
)
#: Definition of a rule or terminal in a Lark snippet (`rule:`, `?rule:`,
#: `rule.2:`, `TERMINAL:`). A template (`rule{a}:`) cannot be a start symbol.
DEFINITION_RE = re.compile(
    r"^[?!]{0,2}([A-Za-z_][A-Za-z0-9_]*)(?:\.-?\d+)?[ \t]*:", re.MULTILINE
)
#: Rule that references every definition of a snippet, so that Lark checks all
#: of them and not only the ones reachable from the first rule.
LARK_START = "audit_start"

SCHEMA_BUNDLE_SCRIPT = MDQ_ROOT / "scripts" / "schema_bundle.py"
PY_DIR = MDQ_ROOT / "mdq-py"
#: The test file of the reference implementation that step 13 runs, relative
#: to `mdq-py/`.
AGREEMENT_TEST = "tests/test_schema_agreement.py"
#: Lines of the pytest output reported when no failing test id can be parsed.
OUTPUT_TAIL_LINES = 15
#: A line of the pytest short summary (`-rf`) that reports a failing test.
PYTEST_SUMMARY_RE = re.compile(r"^(?:FAILED|ERROR) (\S.*?)(?: - .*)?$")


class AuditSkip(Exception):
    """Raised by a step that cannot run in this checkout. Not a failure."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class AuditFailure(Exception):
    def __init__(self, problems: list[str]) -> None:
        super().__init__(f"{len(problems)} problem(s)")
        self.problems = problems


@dataclass
class Rule:
    """A row of an "Additional Rules" table."""

    doc: Path
    field: str
    level: str
    code: str
    rule: str
    line: int = 0  # 1-based line of the row

    @property
    def severity(self) -> str:
        return LEVELS[self.level]

    @property
    def scope(self) -> str:
        """The "Question types" entry of `lint-codes.md` this rule needs."""
        if self.doc.stem == "question-base":
            return "any"
        return self.doc.stem


@dataclass
class LintCode:
    """A row of a table of `lint-codes.md`."""

    code: str
    severity: str
    types: set[str]


@dataclass
class Audit:
    #: (code, severity) -> example files of `examples/valid/`.
    valid_lints: dict[tuple[str, str], list[Path]] = field(
        default_factory=lambda: defaultdict(list)
    )
    #: (code, severity) -> example files of `examples/invalid/`.
    invalid_lints: dict[tuple[str, str], list[Path]] = field(
        default_factory=lambda: defaultdict(list)
    )
    rules: list[Rule] = field(default_factory=list)
    lint_codes: list[LintCode] = field(default_factory=list)
    load_errors: set[str] = field(default_factory=set)

    def declared(self) -> dict[str, set[str]]:
        """Code -> severities, from the "Additional Rules" tables."""
        result: dict[str, set[str]] = defaultdict(set)
        for rule in self.rules:
            result[rule.code].add(rule.severity)
        return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def rel(path: Path) -> str:
    return str(path.relative_to(MDQ_ROOT))


def question_type_docs() -> list[Path]:
    return sorted(QUESTION_TYPES_DIR.glob("*.md"))


def rule_docs() -> list[Path]:
    return [*question_type_docs(), EXAM_DOC]


def markdown() -> MarkdownIt:
    return MarkdownIt("commonmark").enable("table").use(footnote_plugin)


def inline_text(token: Token) -> str:
    """The visible text of an inline token, without formatting."""
    parts = []
    for child in token.children or []:
        if child.type in ("text", "code_inline"):
            parts.append(child.content)
        elif child.type in ("softbreak", "hardbreak"):
            parts.append(" ")
    return "".join(parts)


def slugify(text: str) -> str:
    """The anchor GitHub generates for a heading."""
    text = text.strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", "-")


def heading_slugs(tokens: list[Token]) -> set[str]:
    slugs: set[str] = set()
    seen: dict[str, int] = defaultdict(int)
    for i, token in enumerate(tokens):
        if token.type != "heading_open":
            continue
        slug = slugify(inline_text(tokens[i + 1]))
        count = seen[slug]
        seen[slug] += 1
        slugs.add(slug if count == 0 else f"{slug}-{count}")
    return slugs


def split_row(line: str) -> list[str]:
    """Split a raw GFM table row into cells. `\\|` does not split."""
    line = line.strip()
    line = line.removeprefix("|")
    if line.endswith("|") and not line.endswith("\\|"):
        line = line[:-1]
    return [cell.strip() for cell in re.split(r"(?<!\\)\|", line)]


@dataclass
class Table:
    line: int  # 1-based line of the header
    header: list[str]
    rows: list[tuple[int, list[str]]]  # (1-based line, cells)


def tables(tokens: list[Token], start: int = 0, end: int | None = None) -> list[Table]:
    """The tables between `tokens[start:end]`, with the text of each cell."""
    result: list[Table] = []
    current: Table | None = None
    row: list[str] = []
    row_line = 0
    for token in tokens[start:end]:
        if token.type == "table_open":
            current = Table(line=token.map[0] + 1, header=[], rows=[])
        elif token.type == "tr_open":
            row = []
            row_line = token.map[0] + 1
        elif token.type == "inline" and current is not None:
            row.append(inline_text(token).strip())
        elif token.type == "tr_close" and current is not None:
            if not current.header:
                current.header = row
            else:
                current.rows.append((row_line, row))
        elif token.type == "table_close" and current is not None:
            result.append(current)
            current = None
    return result


def section(tokens: list[Token], title: str, level: int) -> tuple[int, int] | None:
    """Token range of the first heading `title` of `level`, up to the next
    heading of the same or a higher level."""
    start = None
    for i, token in enumerate(tokens):
        if token.type != "heading_open":
            continue
        this_level = int(token.tag[1])
        if start is None:
            text = inline_text(tokens[i + 1]).strip()
            if this_level == level and text.casefold() == title.casefold():
                start = i
        elif this_level <= level:
            return start, i
    return None if start is None else (start, len(tokens))


def load_lint_file(path: Path, problems: list[str]) -> list[dict[str, Any]]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        problems.append(f"{rel(path)}: invalid JSON: {error}")
        return []
    if not isinstance(data, list):
        problems.append(f"{rel(path)}: must be a list of diagnostics")
        return []
    entries = []
    for i, entry in enumerate(data):
        where = f"{rel(path)}[{i}]"
        if not isinstance(entry, dict):
            problems.append(f"{where}: must be an object")
            continue
        if not isinstance(entry.get("code"), str) or not CODE_RE.match(entry["code"]):
            problems.append(f"{where}: bad code {entry.get('code')!r}")
            continue
        if entry.get("severity") not in SEVERITIES:
            problems.append(f"{where}: bad severity {entry.get('severity')!r}")
            continue
        if not isinstance(entry.get("path"), list):
            problems.append(f"{where}: `path` must be a list")
            continue
        entries.append(entry)
    return entries


def example_stem(path: Path) -> tuple[str, str] | None:
    """Split an example file into (stem, suffix), or None if the suffix is
    unknown."""
    for suffix in (SOURCE_SUFFIX, LINT_SUFFIX, RESOLVED_SUFFIX, ".yaml", ".json"):
        if path.name.endswith(suffix):
            return str(path)[: -len(suffix)], suffix
    return None


def group_examples(root: Path, problems: list[str]) -> dict[str, set[str]]:
    """Stem -> suffixes of the example files under `root`."""
    groups: dict[str, set[str]] = defaultdict(set)
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        split = example_stem(path)
        if split is None:
            problems.append(f"{rel(path)}: unknown kind of example file")
            continue
        groups[split[0]].add(split[1])
    return groups


def fmt_files(files: list[Path], limit: int = 3) -> str:
    unique = list(dict.fromkeys(files))
    names = [rel(path) for path in unique[:limit]]
    if len(unique) > limit:
        names.append(f"... (+{len(unique) - limit})")
    return ", ".join(names)


def pytest_failures(output: str) -> list[str]:
    """The ids of the tests that failed (or errored) in the `-rf` short summary
    of a pytest `output`."""
    ids = []
    for line in output.splitlines():
        match = PYTEST_SUMMARY_RE.match(line.strip())
        if match:
            ids.append(match.group(1))
    return ids


def output_tail(output: str, lines: int = OUTPUT_TAIL_LINES) -> list[str]:
    """The last non-empty `lines` lines of `output`."""
    return [line for line in output.splitlines() if line.strip()][-lines:]


def run(command: list[str], cwd: Path = MDQ_ROOT) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command, cwd=cwd, capture_output=True, text=True, encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------


def step_bundle(check: bool) -> str:
    """Step 0: regenerate the schema bundle, or with `check` verify its copies.

    Runs `schema_bundle.py` with this interpreter: the dependencies of the
    audit include the ones of the bundle script, so no nested `uv` is needed.
    """
    command = [sys.executable, str(SCHEMA_BUNDLE_SCRIPT)]
    if check:
        command.append("--check")
    result = run(command)
    if result.returncode != 0:
        problems = [line for line in result.stderr.splitlines() if line.strip()]
        raise AuditFailure(problems or [f"schema_bundle.py exited with {result.returncode}"])
    lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return "; ".join(lines)


def step_schemas(audit: Audit) -> str:
    problems: list[str] = []
    schemas = sorted(SCHEMA_DIR.glob("*.yaml"))
    for path in schemas:
        try:
            schema = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as error:
            problems.append(f"{rel(path)}: invalid YAML: {error}")
            continue
        if not isinstance(schema, dict):
            problems.append(f"{rel(path)}: is not a mapping")
            continue
        if "$schema" not in schema:
            problems.append(f"{rel(path)}: has no `$schema`")
        try:
            validator_for(schema).check_schema(schema)
        except SchemaError as error:
            problems.append(f"{rel(path)}: invalid JSON Schema: {error.message}")

    schema_names = {path.stem for path in schemas}
    doc_names = {path.stem for path in rule_docs()}
    for name in sorted(doc_names - schema_names):
        problems.append(f"no schema/{name}.yaml for the document {name}.md")
    for name in sorted(schema_names - doc_names):
        problems.append(f"no document for schema/{name}.yaml")

    if problems:
        raise AuditFailure(problems)
    return f"{len(schemas)} schemas, each with a document"


def check_markdown(path: Path, problems: list[str]) -> None:
    source = path.read_text(encoding="utf-8")
    lines = source.splitlines()
    env: dict[str, Any] = {}
    tokens = markdown().parse(source, env)
    name = rel(path)

    # Headings: one H1, first, and no skipped level.
    previous = 0
    for i, token in enumerate(tokens):
        if token.type != "heading_open":
            continue
        level = int(token.tag[1])
        line = token.map[0] + 1
        text = inline_text(tokens[i + 1]).strip()
        if not text:
            problems.append(f"{name}:{line}: empty heading")
        if previous == 0 and level != 1:
            problems.append(f"{name}:{line}: first heading is H{level}, not H1")
        elif previous and level == 1:
            problems.append(f"{name}:{line}: second H1 {text!r}")
        elif previous and level > previous + 1:
            problems.append(f"{name}:{line}: H{level} {text!r} follows H{previous}")
        previous = level
    if previous == 0:
        problems.append(f"{name}: has no heading")

    # Code fences must be closed.
    for token in tokens:
        if token.type != "fence":
            continue
        end = token.map[1]
        last = lines[end - 1].strip() if end <= len(lines) else ""
        closed = end - token.map[0] > 1 and last.startswith(token.markup)
        closed = closed and set(last) <= set(token.markup[0])
        if not closed:
            problems.append(f"{name}:{token.map[0] + 1}: code fence is not closed")

    # Every row of a table has as many cells as the header.
    for token in tokens:
        if token.type == "tr_open":
            row_line = token.map[0]
            cells = len(split_row(lines[row_line]))
            header = len(split_row(lines[_table_start(tokens, token)]))
            if cells != header:
                problems.append(
                    f"{name}:{row_line + 1}: table row has {cells} cells, "
                    f"header has {header}"
                )

    # Footnotes: every reference is defined and every definition is used.
    refs = (env.get("footnotes") or {}).get("refs") or {}
    defined = {label.removeprefix(":") for label in refs}
    used = set()
    for token in tokens:
        for child in token.children or []:
            if child.type == "footnote_ref":
                used.add(child.meta["label"])
            elif child.type == "text":
                for label in re.findall(r"\[\^([^\]\s]+)\]", child.content):
                    problems.append(
                        f"{name}:{token.map[0] + 1}: undefined footnote [^{label}]"
                    )
    for label in sorted(defined - used):
        problems.append(f"{name}: footnote [^{label}] is never referenced")

    # Internal links and anchors.
    own_slugs = heading_slugs(tokens)
    for token in tokens:
        for child in token.children or []:
            if child.type == "link_open":
                target = str(child.attrs.get("href", ""))
            elif child.type == "image":
                target = str(child.attrs.get("src", ""))
            else:
                continue
            where = f"{name}:{token.map[0] + 1}"
            check_link(path, target, own_slugs, where, problems)


def _table_start(tokens: list[Token], row: Token) -> int:
    """0-based line of the header of the table holding `row`."""
    index = tokens.index(row)
    for token in reversed(tokens[:index]):
        if token.type == "table_open":
            return token.map[0]
    raise ValueError("row outside a table")


def check_link(
    path: Path, target: str, own_slugs: set[str], where: str, problems: list[str]
) -> None:
    if not target or re.match(r"^[a-z][a-z0-9+.-]*:", target, re.IGNORECASE):
        return
    file_part, _, anchor = target.partition("#")
    if file_part:
        linked = (path.parent / file_part).resolve()
        if not linked.exists():
            problems.append(f"{where}: link to missing file {target!r}")
            return
    else:
        linked = path
    if not anchor:
        return
    if linked == path:
        slugs = own_slugs
    elif linked.suffix == ".md" and linked.is_file():
        slugs = heading_slugs(markdown().parse(linked.read_text(encoding="utf-8")))
    else:
        return
    if anchor not in slugs:
        problems.append(f"{where}: link to missing anchor {target!r}")


def step_docs(audit: Audit) -> str:
    problems: list[str] = []
    docs = sorted(DOCS_DIR.rglob("*.md"))
    for path in docs:
        check_markdown(path, problems)
    if problems:
        raise AuditFailure(problems)
    return f"{len(docs)} documents in docs/"


def collect_lints(
    stem: str, target: dict[tuple[str, str], list[Path]], problems: list[str]
) -> list[dict[str, Any]]:
    path = Path(stem + LINT_SUFFIX)
    entries = load_lint_file(path, problems)
    for entry in entries:
        target[(entry["code"], entry["severity"])].append(path)
    return entries


def step_valid_corpus(audit: Audit) -> str:
    problems: list[str] = []
    groups = group_examples(VALID_DIR, problems)
    model_only = 0
    for stem, suffixes in sorted(groups.items()):
        name = rel(Path(stem))
        if ".json" in suffixes:
            problems.append(f"{name}.json: valid examples use .yaml, not .json")
        if SOURCE_SUFFIX in suffixes and ".yaml" not in suffixes:
            problems.append(f"{name}{SOURCE_SUFFIX}: has no .yaml")
        if RESOLVED_SUFFIX in suffixes and not suffixes & {SOURCE_SUFFIX, ".yaml"}:
            problems.append(f"{name}{RESOLVED_SUFFIX}: has no exam document")
        if suffixes == {LINT_SUFFIX}:
            problems.append(f"{name}{LINT_SUFFIX}: has no document")
            continue
        if ".yaml" in suffixes and SOURCE_SUFFIX not in suffixes:
            model_only += 1
        if ".yaml" in suffixes:
            try:
                yaml.safe_load(Path(stem + ".yaml").read_text(encoding="utf-8"))
            except yaml.YAMLError as error:
                problems.append(f"{name}.yaml: invalid YAML: {error}")
        if LINT_SUFFIX in suffixes:
            for entry in collect_lints(stem, audit.valid_lints, problems):
                if entry["severity"] == "error":
                    problems.append(
                        f"{name}{LINT_SUFFIX}: a valid example reports the "
                        f"error {entry['code']!r}"
                    )
    if problems:
        raise AuditFailure(problems)
    codes = {code for code, _ in audit.valid_lints}
    return (
        f"{len(groups)} examples ({model_only} without {SOURCE_SUFFIX}), "
        f"{len(codes)} lint codes"
    )


def step_rule_tables(audit: Audit) -> str:
    problems: list[str] = []
    for path in rule_docs():
        name = rel(path)
        tokens = markdown().parse(path.read_text(encoding="utf-8"))
        bounds = section(tokens, "Additional Rules", level=2)
        if bounds is None:
            problems.append(f"{name}: has no `## Additional Rules` section")
            continue
        found = tables(tokens, *bounds)
        if not found:
            problems.append(f"{name}: `## Additional Rules` has no table")
            continue
        for table in found:
            if table.header != RULES_HEADER:
                problems.append(
                    f"{name}:{table.line}: table header is "
                    f"{' | '.join(table.header)!r}, expected "
                    f"{' | '.join(RULES_HEADER)!r}"
                )
                continue
            for line, cells in table.rows:
                field_, level, code, rule = cells
                where = f"{name}:{line}"
                if level not in LEVELS:
                    problems.append(f"{where}: unknown level {level!r}")
                    continue
                if not CODE_RE.match(code):
                    problems.append(f"{where}: bad or missing code {code!r}")
                    continue
                audit.rules.append(Rule(path, field_, level, code, rule, line))
    for code, severities in sorted(audit.declared().items()):
        if len(severities) > 1:
            where = sorted({rel(r.doc) for r in audit.rules if r.code == code})
            problems.append(
                f"{code}: declared with more than one severity "
                f"({'/'.join(sorted(severities))}) in {', '.join(where)}"
            )
    if problems:
        raise AuditFailure(problems)
    codes = {rule.code for rule in audit.rules}
    return f"{len(audit.rules)} rules, {len(codes)} codes"


def step_valid_vs_spec(audit: Audit) -> str:
    problems: list[str] = []
    declared = audit.declared()
    for (code, severity), files in sorted(audit.valid_lints.items()):
        if code not in declared:
            problems.append(
                f"{code} ({severity}): not declared in any Additional Rules "
                f"table; reported by {fmt_files(files)}"
            )
        elif severity not in declared[code]:
            problems.append(
                f"{code}: the corpus reports {severity}, the spec declares "
                f"{'/'.join(sorted(declared[code]))}; {fmt_files(files)}"
            )
    produced = set(audit.valid_lints)
    for code, severities in sorted(declared.items()):
        for severity in sorted(severities - {"error"}):
            if (code, severity) not in produced and code not in NO_CORPUS_EXAMPLE:
                problems.append(
                    f"{code} ({severity}): declared, but no valid example reports it"
                )
    if problems:
        raise AuditFailure(problems)
    return f"{len(produced)} (code, severity) pairs agree with the spec"


def parse_lint_codes(audit: Audit, problems: list[str]) -> None:
    name = rel(LINT_CODES_DOC)
    tokens = markdown().parse(LINT_CODES_DOC.read_text(encoding="utf-8"))
    known_types = {path.stem for path in question_type_docs()} | {"exam", "any"}
    known_types.discard("question-base")

    errors = section(tokens, "Errors", level=2)
    load = section(tokens, "Load errors", level=2)
    if errors is None or load is None:
        problems.append(f"{name}: needs the sections `## Errors` and `## Load errors`")
        return
    first_heading = next(
        i for i, t in enumerate(tokens) if t.type == "heading_open" and t.tag == "h2"
    )
    parts = [
        ("main", LINT_TABLE_HEADER, tables(tokens, 0, first_heading)),
        ("Errors", ERROR_TABLE_HEADER, tables(tokens, *errors)),
    ]
    for label, header, found in parts:
        if len(found) != 1:
            problems.append(f"{name}: expected one {label} table, found {len(found)}")
            continue
        table = found[0]
        if table.header != header:
            problems.append(
                f"{name}:{table.line}: {label} table header is "
                f"{' | '.join(table.header)!r}, expected {' | '.join(header)!r}"
            )
            continue
        seen: list[str] = []
        for line, cells in table.rows:
            where = f"{name}:{line}"
            code = cells[0].strip("`")
            if label == "main":
                severity, types = cells[1], cells[2]
                if severity not in ("warning", "info"):
                    problems.append(f"{where}: severity {severity!r} in the main table")
                    continue
            else:
                severity, types = "error", cells[1]
            if not CODE_RE.match(code):
                problems.append(f"{where}: bad code {cells[0]!r}")
                continue
            if code in seen:
                problems.append(f"{where}: {code} repeats in the {label} table")
            seen.append(code)
            # "any (`preamble`, `stem`)" -> "any".
            type_set = {
                re.sub(r"\s*\(.*\)$", "", item).strip()
                for item in re.split(r",\s*(?![^()]*\))", types)
            }
            for unknown in sorted(type_set - known_types):
                problems.append(f"{where}: unknown question type {unknown!r}")
            audit.lint_codes.append(LintCode(code, severity, type_set))
        for before, after in zip(seen, seen[1:]):
            if after < before:
                problems.append(
                    f"{name}: in the {label} table, {after} comes after {before}"
                )

    for token in tokens[load[0] : load[1]]:
        if token.type == "inline" and token.level > 2:  # list items
            for child in token.children or []:
                if child.type == "code_inline" and CODE_RE.match(child.content):
                    audit.load_errors.add(child.content)
    if not audit.load_errors:
        problems.append(f"{name}: `## Load errors` lists no code")


def step_lint_codes(audit: Audit) -> str:
    problems: list[str] = []
    parse_lint_codes(audit, problems)

    documented: dict[str, LintCode] = {}
    for entry in audit.lint_codes:
        key = f"{entry.code} ({entry.severity})"
        if entry.code in audit.load_errors:
            problems.append(f"{key}: is both a rule code and a load error")
        if any(other.code == entry.code for other in documented.values()):
            problems.append(f"{entry.code}: listed in more than one table")
        documented[key] = entry

    declared_pairs = {
        (rule.code, rule.severity)
        for rule in audit.rules
        if rule.code not in audit.load_errors
    }
    documented_pairs = {(e.code, e.severity) for e in audit.lint_codes}
    for code, severity in sorted(declared_pairs - documented_pairs):
        problems.append(
            f"{code} ({severity}): declared in an Additional Rules table, "
            f"missing in lint-codes.md"
        )
    for code, severity in sorted(documented_pairs - declared_pairs):
        problems.append(
            f"{code} ({severity}): in lint-codes.md, not declared in any "
            f"Additional Rules table"
        )

    for rule in audit.rules:
        entry = documented.get(f"{rule.code} ({rule.severity})")
        if entry is None or "any" in entry.types or rule.scope in entry.types:
            continue
        problems.append(
            f"{rel(rule.doc)}: declares {rule.code}, but lint-codes.md does not "
            f"list {rule.scope!r} in its question types"
        )

    if problems:
        raise AuditFailure(problems)
    return (
        f"{len(audit.lint_codes)} codes and {len(audit.load_errors)} load errors "
        f"agree with the spec"
    )


def step_invalid_corpus(audit: Audit) -> str:
    problems: list[str] = []
    groups = group_examples(INVALID_DIR, problems)
    for stem, suffixes in sorted(groups.items()):
        name = rel(Path(stem))
        documents = suffixes - {LINT_SUFFIX}
        if RESOLVED_SUFFIX in documents:
            problems.append(f"{name}{RESOLVED_SUFFIX}: invalid examples do not resolve")
        if not documents:
            problems.append(f"{name}{LINT_SUFFIX}: has no document")
            continue
        if LINT_SUFFIX not in suffixes:
            problems.append(f"{name}: has no {LINT_SUFFIX}")
            continue
        entries = collect_lints(stem, audit.invalid_lints, problems)
        if not any(entry["severity"] == "error" for entry in entries):
            problems.append(f"{name}{LINT_SUFFIX}: an invalid example reports no error")

    declared = audit.declared()
    for (code, severity), files in sorted(audit.invalid_lints.items()):
        if code in audit.load_errors:
            if severity != "error":
                problems.append(
                    f"{code}: load error reported as {severity}; {fmt_files(files)}"
                )
        elif code not in declared:
            problems.append(
                f"{code} ({severity}): not declared in the spec; reported by "
                f"{fmt_files(files)}"
            )
        elif severity not in declared[code]:
            problems.append(
                f"{code}: the corpus reports {severity}, the spec declares "
                f"{'/'.join(sorted(declared[code]))}; {fmt_files(files)}"
            )

    produced = set(audit.invalid_lints)
    for code, severities in sorted(declared.items()):
        if code in audit.load_errors or code in NO_CORPUS_EXAMPLE:
            continue
        if "error" in severities and (code, "error") not in produced:
            problems.append(
                f"{code} (error): declared, but no invalid example reports it"
            )

    if problems:
        raise AuditFailure(problems)
    return f"{len(groups)} examples, {len(produced)} (code, severity) pairs"


# Schema types. An atom is a hashable `(kind, value)` pair that stands for one
# alternative of a type: `("type", "string")`, `("lit", "inherit")`,
# `("array", frozenset_of_atoms)` or `("ref", "patternlist")`.

Atom = tuple[str, Any]


def norm_name(name: str) -> str:
    """Normalize a named type for comparison: case and `-` do not matter."""
    return name.replace("-", "").casefold()


def parse_doc_type(text: str) -> frozenset[Atom]:
    """Parse a cell of the Type column of a frontmatter table.

    The vocabulary is a list of alternatives, separated by `,` or `or`. An
    alternative is a JSON type name, `map` (an object), `"literal"`, a named
    type (`grading`, `pattern-list`) or any of them followed by `[]` (an array
    of it). Raises `ValueError` for anything else.
    """
    atoms: set[Atom] = set()
    for item in re.split(r"\s*,\s*(?:or\s+)?|\s+or\s+", text.strip()):
        atoms.add(_parse_doc_alternative(item.strip(), text))
    return frozenset(atoms)


def _parse_doc_alternative(item: str, text: str) -> Atom:
    if item.endswith("[]"):
        return ("array", frozenset({_parse_doc_alternative(item[:-2], text)}))
    if re.fullmatch(r'"[^"]+"', item):
        return ("lit", item[1:-1])
    item = TYPE_ALIASES.get(item, item)
    if item in JSON_TYPES:
        return ("type", item)
    if re.fullmatch(r"[A-Za-z][\w-]*", item):
        return ("ref", norm_name(item))
    raise ValueError(f"cannot parse the type {text!r}")


@cache
def load_schema(path: Path) -> Any:
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def resolve_ref(ref: str, base: Path) -> tuple[Any, Path, str]:
    """Follow a `$ref` found in the schema file `base`.

    Returns the target node, the file it lives in and its name: the last
    segment of the fragment (`#/$defs/Tolerance`) or the file stem.
    """
    file_part, _, fragment = ref.partition("#")
    path = (base.parent / file_part).resolve() if file_part else base
    node = load_schema(path)
    name = path.stem
    for segment in [s for s in fragment.split("/") if s]:
        node = node[segment]
        name = segment
    return node, path, name


def schema_atoms(
    node: Any, path: Path, deref: bool, _seen: frozenset[int] = frozenset()
) -> frozenset[Atom]:
    """The alternatives a schema node accepts.

    A `$ref` is a single named atom, or its target's atoms if `deref`.
    """
    if not isinstance(node, dict) or id(node) in _seen:
        return frozenset()
    seen = _seen | {id(node)}
    atoms: set[Atom] = set()
    if "$ref" in node:
        target, target_path, name = resolve_ref(node["$ref"], path)
        if deref:
            atoms |= schema_atoms(target, target_path, deref, seen)
        else:
            atoms.add(("ref", norm_name(name)))
    if "const" in node:
        atoms.add(("lit", node["const"]))
    for value in node.get("enum", []):
        atoms.add(("lit", value))
    types = node.get("type", [])
    for name in [types] if isinstance(types, str) else types:
        if name == "array":
            items = schema_atoms(node.get("items"), path, deref, seen)
            atoms.add(("array", items))
        else:
            atoms.add(("type", name))
    for key in ("oneOf", "anyOf", "allOf"):
        for option in node.get(key, []):
            atoms |= schema_atoms(option, path, deref, seen)
    return frozenset(atoms)


def schema_properties(
    node: Any, path: Path, inherit: bool = True
) -> dict[str, tuple[Any, Path]]:
    """Property -> (schema node, file) of an object schema.

    Collects `properties` and, through `allOf`, the ones of inline entries.
    A `$ref` entry is followed only if `inherit`.
    """
    result: dict[str, tuple[Any, Path]] = {}
    for entry in node.get("allOf", []):
        if "$ref" in entry:
            if inherit:
                target, target_path, _ = resolve_ref(entry["$ref"], path)
                result |= schema_properties(target, target_path, inherit)
        else:
            result |= schema_properties(entry, path, inherit)
    for name, value in (node.get("properties") or {}).items():
        result[name] = (value, path)
    return result


def types_agree(doc: frozenset[Atom], schema: frozenset[Atom], prop: str) -> bool:
    """Whether the Type column `doc` describes the schema type `schema`.

    Two leniencies: `string` stands for an enum of strings (the description
    lists the values), and a named type that is the name of the property
    stands for an enum declared inline.
    """
    docs, schemas = set(doc), set(schema)
    str_lits = {a for a in schemas if a[0] == "lit" and isinstance(a[1], str)}
    if ("type", "string") in docs:
        schemas = (schemas - str_lits) | ({("type", "string")} if str_lits else set())
    elif ("ref", norm_name(prop)) in docs and not any(a[0] == "ref" for a in schemas):
        docs.discard(("ref", norm_name(prop)))
        schemas -= str_lits
    doc_arrays = {a for a in docs if a[0] == "array"}
    schema_arrays = {a for a in schemas if a[0] == "array"}
    if len(doc_arrays) == len(schema_arrays) == 1:
        if not types_agree(
            doc_arrays.copy().pop()[1], schema_arrays.copy().pop()[1], ""
        ):
            return False
        docs -= doc_arrays
        schemas -= schema_arrays
    return docs == schemas


def describe(atoms: frozenset[Atom]) -> str:
    parts = []
    for kind, value in sorted(atoms, key=repr):
        if kind == "array":
            parts.append(f"[{describe(value)}]")
        elif kind == "lit":
            parts.append(json.dumps(value))
        else:
            parts.append(str(value))
    return " | ".join(parts) or "(none)"


def either_values(description: str) -> set[str]:
    """The quoted values of a description that starts like `Either "a" or "b"`."""
    match = re.match(r"Either\s+(.*?)(?:[.:\[]|$)", description)
    return set(re.findall(r'"([^"]+)"', match.group(1))) if match else set()


def check_frontmatter(path: Path, problems: list[str]) -> None:
    name = rel(path)
    source = path.read_text(encoding="utf-8")
    tokens = markdown().parse(source)
    bounds = section(tokens, "Frontmatter", level=2)
    if bounds is None:
        problems.append(f"{name}: has no `## Frontmatter` section")
        return
    found = tables(tokens, *bounds)
    if len(found) != 1 or found[0].header != FRONTMATTER_HEADER:
        problems.append(
            f"{name}:{tokens[bounds[0]].map[0] + 1}: `## Frontmatter` needs "
            f"exactly one `{' | '.join(FRONTMATTER_HEADER)}` table"
        )
        return
    table = found[0]
    schema_path = SCHEMA_DIR / f"{path.stem}.yaml"
    schema = load_schema(schema_path)
    properties = schema_properties(schema, schema_path)
    own = schema_properties(schema, schema_path, inherit=False)
    base = path.stem == BASE_SCHEMA
    used_shorthands: set[tuple[str, str]] = set()

    for line, (field_, type_cell, description) in table.rows:
        where = f"{name}:{line}"
        if (path.stem, field_) in FRONTMATTER_SHORTHANDS:
            used_shorthands.add((path.stem, field_))
            continue
        if field_ not in properties:
            problems.append(f"{where}: `{field_}` is not a property of the schema")
            continue
        try:
            doc_type = parse_doc_type(type_cell)
        except ValueError as error:
            problems.append(f"{where}: `{field_}`: {error}")
            continue
        node, node_path = properties[field_]
        if field_ == "type" and not base:
            expected = schema_atoms(node, node_path, deref=True)
            if doc_type != {("lit", path.stem)} or expected != {("lit", path.stem)}:
                problems.append(
                    f"{where}: `type` is {describe(doc_type)} in the table and "
                    f"{describe(expected)} in the schema, expected "
                    f"{json.dumps(path.stem)}"
                )
            continue
        opaque = schema_atoms(node, node_path, deref=False)
        full = schema_atoms(node, node_path, deref=True)
        if not opaque:
            continue
        if not (
            types_agree(doc_type, opaque, field_) or types_agree(doc_type, full, field_)
        ):
            problems.append(
                f"{where}: `{field_}` is {type_cell!r} in the table, "
                f"{describe(opaque)} in the schema"
            )
            continue
        literals = {a[1] for a in full if a[0] == "lit"}
        listed = either_values(description)
        if ("type", "string") in doc_type and literals and len(listed) > 1:
            if listed != literals:
                problems.append(
                    f"{where}: `{field_}` lists {sorted(listed)} in the "
                    f"description, the schema enum is {sorted(literals)}"
                )

    for stem, field_ in sorted(FRONTMATTER_SHORTHANDS):
        if stem == path.stem and (stem, field_) not in used_shorthands:
            problems.append(
                f"{name}:{table.line}: the allowlisted shorthand `{field_}` "
                f"is not a row of the frontmatter table"
            )

    in_table = {cells[0] for _, cells in table.rows}
    for prop in own:
        mentioned = re.search(rf"(?<![\w-]){re.escape(prop)}(?![\w-])", source)
        if prop not in in_table and not mentioned:
            problems.append(
                f"{name}:{table.line}: the schema property `{prop}` is neither "
                f"in the frontmatter table nor mentioned in the text"
            )


def step_frontmatter(audit: Audit) -> str:
    problems: list[str] = []
    docs = rule_docs()
    for path in docs:
        if (SCHEMA_DIR / f"{path.stem}.yaml").is_file():
            check_frontmatter(path, problems)
    if problems:
        raise AuditFailure(problems)
    return f"{len(docs)} frontmatter tables agree with their schemas"


# Schema paths: `tolerance.absolute`, `choices[].id`. `[]` goes into the items
# of an array and `.` into a property.

Segment = str  # a property name, or `[]` for the items of an array


def expand_braces(text: str) -> list[str]:
    """Expand the first `{a,b}` group of `text`, recursively."""
    match = re.search(r"\{([^{}]*)\}", text)
    if match is None:
        return [text]
    result: list[str] = []
    for option in match.group(1).split(","):
        result += expand_braces(
            text[: match.start()] + option.strip() + text[match.end() :]
        )
    return result


def parse_field_paths(text: str) -> list[list[Segment]]:
    """Parse a cell of the Field column into paths.

    The cell is a list of paths separated by `,` (outside braces) and a path
    may have a brace group (`questions[].{stem,epilogue}`). A path is a
    sequence of segments: properties and `[]`.
    """
    items = re.split(r",\s*(?![^{}]*\})", text.strip())
    paths: list[list[Segment]] = []
    for item in items:
        for expanded in expand_braces(item.strip()):
            segments: list[Segment] = []
            for part in expanded.split("."):
                base = part
                arrays = 0
                while base.endswith("[]"):
                    base = base[:-2]
                    arrays += 1
                if not re.fullmatch(r"[A-Za-z][\w-]*", base):
                    raise ValueError(f"cannot parse the path {expanded!r}")
                segments += [base] + ["[]"] * arrays
            paths.append(segments)
    return paths


def schema_variants(node: Any, path: Path) -> list[tuple[Any, Path]]:
    """The node and every node reachable through `$ref`, `allOf`, `oneOf` and
    `anyOf`."""
    result: list[tuple[Any, Path]] = []
    stack = [(node, path)]
    seen: set[int] = set()
    while stack:
        current, current_path = stack.pop()
        if not isinstance(current, dict) or id(current) in seen:
            continue
        seen.add(id(current))
        result.append((current, current_path))
        if "$ref" in current:
            target, target_path, _ = resolve_ref(current["$ref"], current_path)
            stack.append((target, target_path))
        for key in ("allOf", "oneOf", "anyOf"):
            stack += [(option, current_path) for option in current.get(key, [])]
    return result


def schema_path_exists(root: Any, path: Path, segments: list[Segment]) -> bool:
    """Whether `segments` exists in ANY branch of the schema `root`."""
    nodes = [(root, path)]
    for segment in segments:
        children: list[tuple[Any, Path]] = []
        for node, node_path in nodes:
            for variant, variant_path in schema_variants(node, node_path):
                if segment == "[]":
                    if "items" in variant:
                        children.append((variant["items"], variant_path))
                elif segment in (variant.get("properties") or {}):
                    children.append((variant["properties"][segment], variant_path))
        if not children:
            return False
        nodes = children
    return True


def check_rule_field(rule: Rule, schema_path: Path, root: Any) -> str | None:
    """The problem of a rule whose field is not a schema path, or None."""
    where = f"{rel(rule.doc)}:{rule.line}"
    stem = rule.doc.stem
    text = rule.field
    if text in PSEUDO_FIELDS:
        return None
    try:
        paths = parse_field_paths(text)
    except ValueError as error:
        return f"{where}: field `{text}`: {error}"
    for segments in paths:
        if len(segments) == 1 and (stem, segments[0]) in FRONTMATTER_SHORTHANDS:
            continue
        if not schema_path_exists(root, schema_path, segments):
            return f"{where}: field `{text}` is not a path of schema/{stem}.yaml"
    return None


def step_rule_fields(audit: Audit) -> str:
    problems: list[str] = []
    for rule in audit.rules:
        schema_path = SCHEMA_DIR / f"{rule.doc.stem}.yaml"
        if not schema_path.is_file():
            continue
        problem = check_rule_field(rule, schema_path, load_schema(schema_path))
        if problem:
            problems.append(problem)
    if problems:
        raise AuditFailure(problems)
    return f"{len(audit.rules)} rule fields are paths of their schemas"


@dataclass
class PropertyDef:
    """A property declared in a schema file."""

    name: str
    where: str  # `file#/pointer`
    atoms: frozenset[Atom]


def pointer_escape(segment: str) -> str:
    return segment.replace("~", "~0").replace("/", "~1")


def collect_properties(path: Path) -> list[PropertyDef]:
    """Every property declared in the schema file `path`, wherever it is.

    A property that a schema inherits through `allOf` and `$ref` is declared
    only in the file that defines it.
    """
    found: list[PropertyDef] = []

    def walk(node: Any, pointer: str) -> None:
        if isinstance(node, list):
            for i, item in enumerate(node):
                walk(item, f"{pointer}/{i}")
        elif isinstance(node, dict):
            for key, value in node.items():
                here = f"{pointer}/{pointer_escape(str(key))}"
                if key == "properties" and isinstance(value, dict):
                    for name, sub in value.items():
                        where = f"{rel(path)}#{here}/{pointer_escape(name)}"
                        atoms = schema_atoms(sub, path, deref=True)
                        found.append(PropertyDef(name, where, atoms))
                        walk(sub, f"{here}/{pointer_escape(name)}")
                else:
                    walk(value, here)

    walk(load_schema(path), "")
    return found


def property_conflicts(
    definitions: list[PropertyDef], ignored: set[str], check_allowlist: bool = True
) -> list[str]:
    """Problems of the properties that have different types in different
    places. `ignored` are names that are not compared, as are the names in
    POLYMORPHIC_PROPERTIES unless `check_allowlist` is False."""
    groups: dict[str, list[PropertyDef]] = defaultdict(list)
    for definition in definitions:
        groups[definition.name].append(definition)
    problems: list[str] = []
    for name, group in sorted(groups.items()):
        if name in ignored or (check_allowlist and name in POLYMORPHIC_PROPERTIES):
            continue
        if name == "type":
            # Each question type declares its own `const`.
            group = [d for d in group if not any(a[0] == "lit" for a in d.atoms)]
        if len({d.atoms - {("lit", INHERIT)} for d in group}) > 1:
            listing = "; ".join(f"{d.where} is {describe(d.atoms)}" for d in group)
            problems.append(f"property `{name}` has different types: {listing}")
    return problems


def stale_property_entries(
    definitions: list[PropertyDef], ignored: set[str]
) -> list[str]:
    """Problems of the allowlist entries that no longer apply."""
    groups: dict[str, list[PropertyDef]] = defaultdict(list)
    for definition in definitions:
        groups[definition.name].append(definition)
    problems: list[str] = []
    for name in sorted(POLYMORPHIC_PROPERTIES):
        if name not in groups:
            problems.append(f"POLYMORPHIC_PROPERTIES: `{name}` is not a property")
        elif not property_conflicts(groups[name], ignored, check_allowlist=False):
            problems.append(
                f"POLYMORPHIC_PROPERTIES: `{name}` has the same type everywhere"
            )
    for name in sorted(NAMING_EXCEPTIONS):
        if name not in groups:
            problems.append(f"NAMING_EXCEPTIONS: `{name}` is not a property")
        elif CAMEL_CASE_RE.match(name):
            problems.append(f"NAMING_EXCEPTIONS: `{name}` is already camelCase")
    return problems


def step_property_consistency(audit: Audit) -> str:
    problems: list[str] = []
    definitions: list[PropertyDef] = []
    for path in sorted(SCHEMA_DIR.glob("*.yaml")):
        definitions += collect_properties(path)
    # `grading` and similar maps are keyed by question type: `multiple-choice`
    # is a key there, not a property name to check.
    question_types = {p.stem for p in question_type_docs()} - {BASE_SCHEMA}
    for definition in definitions:
        if definition.name in question_types:
            continue
        if (
            not CAMEL_CASE_RE.match(definition.name)
            and definition.name not in NAMING_EXCEPTIONS
        ):
            problems.append(
                f"property `{definition.name}` is not camelCase: {definition.where}"
            )
    problems += property_conflicts(definitions, question_types)
    problems += stale_property_entries(definitions, question_types)
    if problems:
        raise AuditFailure(problems)
    names = {d.name for d in definitions}
    return f"{len(names)} property names, {len(definitions)} definitions agree"

def lark_stubs(snippet: str) -> tuple[Any, dict[str, str]]:
    """Compile a Lark snippet that may use undefined rules and terminals.

    Each name that Lark reports as undefined gets a stub (`name: "name_stub"`
    for a rule, `NAME: "NAME_STUB"` for a terminal) and the snippet compiles
    again. Returns the `Lark` object and the stubs. Any other error (or an
    undefined template, that no stub can replace) is raised: `ValueError` if
    the snippet defines nothing, `lark.exceptions.LarkError` or `OSError` (a
    `%import` of a missing grammar) otherwise.
    """
    names = DEFINITION_RE.findall(snippet)
    if not names:
        raise ValueError("defines no rule or terminal")
    root = f"\n{LARK_START}: {' | '.join(dict.fromkeys(names))}"
    stubs: dict[str, str] = {}
    while True:
        source = snippet + root + "".join(f"\n{name}: {body}" for name, body in stubs.items())
        try:
            return lark.Lark(source, start=LARK_START), stubs
        except lark.exceptions.GrammarError as error:
            found = UNDEFINED_RE.match(str(error))
            name = found and (found.group(1) or found.group(2))
            if not name or name in stubs or str(error).startswith("Template"):
                raise
            literal = f"{name}_STUB" if name.isupper() else f"{name}_stub"
            stubs[name] = json.dumps(literal)


def check_fence(name: str, line: int, token: Token, problems: list[str]) -> None:
    """Check one top-level code fence of the file `name` at `line`."""
    where = f"{name}:{line}"
    words = token.info.split()
    language = words[0] if words else ""
    if language not in FENCE_LANGUAGES:
        found = f"language {language!r}" if language else "no language"
        hint = " (use `md`, not `markdown`)" if language == "markdown" else ""
        problems.append(
            f"{where}: code fence has {found}{hint}, expected one of "
            f"{', '.join(FENCE_LANGUAGES)}"
        )
        return
    try:
        if language == "json":
            json.loads(token.content)
        elif language == "yaml":
            list(yaml.safe_load_all(token.content))
        elif language == "lark":
            lark_stubs(token.content)
    except (ValueError, yaml.YAMLError, lark.exceptions.LarkError, OSError) as error:
        message = str(error).strip().replace("\n", " ")
        problems.append(f"{where}: invalid {language} block: {message}")


#: Sentinel for a path segment that is not in the document.
_MISSING = object()


def lint_path_problem(document: Any, path: list[Any]) -> str | None:
    """Why `path` does not resolve in `document`, or None if it does.

    Integer segments index lists and string segments key mappings. The last
    segment may be a key absent from a mapping: the diagnostic is then about a
    missing value (`missing-title`). Use `lint_path_is_absent_value` to tell
    the two cases apart.
    """
    node = document
    for i, segment in enumerate(path):
        last = i == len(path) - 1
        here = json.dumps(path[: i + 1])
        if isinstance(segment, bool) or not isinstance(segment, (int, str)):
            return f"segment {segment!r} must be a string or an integer"
        if isinstance(segment, int):
            if not isinstance(node, list):
                return f"{here}: index into a {type(node).__name__}, not a list"
            if not -len(node) <= segment < len(node) or segment < 0:
                return f"{here}: index out of range (the list has {len(node)})"
            node = node[segment]
        else:
            if not isinstance(node, dict):
                return f"{here}: key into a {type(node).__name__}, not a mapping"
            if segment not in node:
                if last:
                    return None
                return f"{here}: no such key"
            node = node[segment]
    return None


def lint_path_is_absent_value(document: Any, path: list[Any]) -> bool:
    """Whether `path` resolves only because its last key is absent."""
    if not path or not isinstance(path[-1], str):
        return False
    parent = document
    for segment in path[:-1]:
        parent = parent[segment]
    return isinstance(parent, dict) and path[-1] not in parent


def load_example_document(stem: str) -> tuple[Any, str] | None:
    """The data model of an example (`.yaml`, else `.json`) and its suffix, or
    None if it has none. Raises `ValueError` if the file does not parse."""
    for suffix in (".yaml", ".json"):
        path = Path(stem + suffix)
        if path.is_file():
            try:
                return yaml.safe_load(path.read_text(encoding="utf-8")), suffix
            except yaml.YAMLError as error:
                raise ValueError(f"{rel(path)}: invalid YAML: {error}") from error
    return None


def step_lint_paths(audit: Audit) -> str:
    """Lint paths refer to the source document, not to `.resolved.yaml`: the
    corpus tests load the source (`load(doc_path)`), and resolution only
    expands `include` blocks."""
    problems: list[str] = []
    checked = entries_count = 0
    skipped = 0
    absent: dict[str, int] = defaultdict(int)
    for root in (VALID_DIR, INVALID_DIR):
        for lint_path in sorted(root.rglob(f"*{LINT_SUFFIX}")):
            name = rel(lint_path)
            entries = load_lint_file(lint_path, [])
            # No duplicate-entry check: the corpus tests compare lint output as
            # a multiset, so repeated diagnostics are meaningful (two NBSP in
            # one file give two entries).
            stem = str(lint_path)[: -len(LINT_SUFFIX)]
            try:
                loaded = load_example_document(stem)
            except ValueError:
                # A syntax example is invalid on purpose: no data model.
                skipped += 1
                continue
            if loaded is None:
                skipped += 1
                continue
            document, _ = loaded
            checked += 1
            for entry in entries:
                entries_count += 1
                problem = lint_path_problem(document, entry["path"])
                if problem:
                    problems.append(
                        f"{name}: {entry['code']} at "
                        f"{json.dumps(entry['path'])}: {problem}"
                    )
                elif lint_path_is_absent_value(document, entry["path"]):
                    absent[entry["code"]] += 1
    if problems:
        raise AuditFailure(problems)
    return (
        f"{entries_count} paths in {checked} lint files resolve "
        f"({sum(absent.values())} on an absent last key), "
        f"{skipped} files skipped (no parsable .yaml/.json)"
    )


def step_code_blocks(audit: Audit) -> str:
    problems: list[str] = []
    count = 0
    for path in sorted(DOCS_DIR.rglob("*.md")):
        tokens = markdown().parse(path.read_text(encoding="utf-8"))
        for token in tokens:
            if token.type == "fence":
                count += 1
                check_fence(rel(path), token.map[0] + 1, token, problems)
    if problems:
        raise AuditFailure(problems)
    return f"{count} code blocks use a known language and are valid"


def step_schema_agreement(audit: Audit) -> str:
    if not PY_DIR.is_dir():
        raise AuditSkip("mdq-py/ is not present")
    uv = shutil.which("uv")
    if uv is None:
        raise AuditFailure(["`uv` is not on the PATH, cannot run the mdq-py tests"])
    result = run(
        [uv, "run", "--directory", str(PY_DIR), "pytest", "-q", "-rf", AGREEMENT_TEST]
    )
    if result.returncode != 0:
        output = result.stdout + result.stderr
        failed = pytest_failures(output)
        if failed:
            raise AuditFailure(failed)
        raise AuditFailure(
            [f"pytest exited with {result.returncode}; end of its output:"]
            + [f"    {line}" for line in output_tail(output)]
        )
    summary = output_tail(result.stdout, 1)
    return f"mdq-py/{AGREEMENT_TEST}: {summary[0] if summary else 'passed'}"


STEPS: list[tuple[str, Callable[[Audit], str]]] = [
    ("schemas", step_schemas),
    ("docs", step_docs),
    ("valid corpus", step_valid_corpus),
    ("additional rules", step_rule_tables),
    ("valid corpus vs spec", step_valid_vs_spec),
    ("lint-codes.md", step_lint_codes),
    ("invalid corpus", step_invalid_corpus),
    ("frontmatter tables", step_frontmatter),
    ("rule fields", step_rule_fields),
    ("property consistency", step_property_consistency),
    ("code blocks", step_code_blocks),
    ("lint paths", step_lint_paths),
    ("schema agreement", step_schema_agreement),
]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "-x",
        "--fail-fast",
        action="store_true",
        help="stop at the first step that fails",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="do not regenerate the schema bundle: fail if a copy is stale",
    )
    args = parser.parse_args(argv)

    audit = Audit()
    failed = skipped = 0
    total = 0
    numbered: list[tuple[int, str, Callable[[], str]]] = [
        (0, "schema bundle", lambda: step_bundle(args.check)),
        *(
            (number, title, lambda step=step: step(audit))
            for number, (title, step) in enumerate(STEPS, start=1)
        ),
    ]
    for number, title, run_step in numbered:
        try:
            message = run_step()
        except AuditSkip as skip:
            skipped += 1
            print(f"skip {number}. {title}: {skip.reason}")
        except AuditFailure as failure:
            failed += 1
            total += len(failure.problems)
            print(f"FAIL {number}. {title}: {len(failure.problems)} problem(s)")
            for problem in failure.problems:
                print(f"  - {problem}")
            if args.fail_fast:
                return 1
        else:
            print(f"ok   {number}. {title}: {message}")
    if failed:
        print(f"\n{failed} of {len(numbered)} steps failed, {total} problem(s)")
        return 1
    note = f" ({skipped} skipped)" if skipped else ""
    print(f"\nall {len(numbered) - skipped} steps passed{note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
