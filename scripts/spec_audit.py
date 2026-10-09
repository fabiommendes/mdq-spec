# /// script
# requires-python = ">=3.13"
# dependencies = [
#   "PyYAML>=6.0",
#   "jsonschema>=4.18",
#   "markdown-it-py>=3.0",
#   "mdit-py-plugins>=0.4",
# ]
# ///
"""
Audit the consistency of the specification: the schemas, the documents in
`docs/`, the "Additional Rules" tables, `docs/lint-codes.md` and the example
corpus.

The audit runs these steps in order and reports every problem it finds:

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

Run it from the repository root with `uv run scripts/spec_audit.py`.
`--fail-fast` stops at the first step that fails. A step that fails still
feeds the steps after it with the data it could collect.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

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

CODE_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

#: Declared codes that no corpus example can report, with the reason.
NO_CORPUS_EXAMPLE = {
    "empty-include-all": "only Exam.resolve reports it, never load",
}


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


# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------


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
                audit.rules.append(Rule(path, field_, level, code, rule))
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


STEPS: list[tuple[str, Callable[[Audit], str]]] = [
    ("schemas", step_schemas),
    ("docs", step_docs),
    ("valid corpus", step_valid_corpus),
    ("additional rules", step_rule_tables),
    ("valid corpus vs spec", step_valid_vs_spec),
    ("lint-codes.md", step_lint_codes),
    ("invalid corpus", step_invalid_corpus),
]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "-x",
        "--fail-fast",
        action="store_true",
        help="stop at the first step that fails",
    )
    args = parser.parse_args(argv)

    audit = Audit()
    failed = 0
    total = 0
    for number, (title, step) in enumerate(STEPS, start=1):
        try:
            message = step(audit)
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
        print(f"\n{failed} of {len(STEPS)} steps failed, {total} problem(s)")
        return 1
    print(f"\nall {len(STEPS)} steps passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
