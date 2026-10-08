# /// script
# requires-python = ">=3.13"
# dependencies = []
# ///
"""
Generate the tables of the inexact comparison of short-answer patterns
(docs/references/patterns.md, "Inexact literals").

The tables come from three files of fixed versions of Unicode and of the
CLDR, so that every implementation compares text in the same way, whatever
the Unicode version of its runtime:

* `ignorable`: the C0 and C1 controls that are not whitespace, and the
  `Default_Ignorable_Code_Point` property of `DerivedCoreProperties.txt`.
* `letters`: the Latin letters of the CLDR `Latin-ASCII` transform.
* `punctuation`: the quotes and dashes of the same transform, and the
  minus sign.
* `caseFolding`: the full case folding of `CaseFolding.txt` (status `C`
  and `F`).

Run it from the repository root with `uv run scripts/inexact_tables.py`. It
downloads the sources and writes the tables to `docs/references/` and to the
package source of each subtree (`mdq-py/`, `mdq-js/`) that is present in the
checkout. `--check` downloads and writes nothing: it fails if a copy differs
from the file in `docs/references/`.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path
from typing import Any

MDQ_ROOT = Path(__file__).resolve().parent.parent

TABLES_FILENAME = "inexact-tables.json"

UNICODE_VERSION = "18.0.0"
CLDR_VERSION = "48"

UCD_URL = f"https://www.unicode.org/Public/{UNICODE_VERSION}/ucd"
SOURCES = {
    "latin-ascii": (
        "https://raw.githubusercontent.com/unicode-org/cldr/"
        f"release-{CLDR_VERSION}/common/transforms/Latin-ASCII.xml"
    ),
    "case-folding": f"{UCD_URL}/CaseFolding.txt",
    "derived-core-properties": f"{UCD_URL}/DerivedCoreProperties.txt",
}

#: Where each subtree keeps its copy of the tables, relative to the root.
SUBTREE_DIRS = {
    "mdq-py": Path("mdq-py") / "mdq",
    "mdq-js": Path("mdq-js") / "src",
}

#: The sections of `Latin-ASCII.xml` behind each table, by their header
#: comment.
LETTER_SECTIONS = ("Latin letters and IPA", "Latin extended C and D (later addition)")
PUNCTUATION_SECTIONS = ("Quotes, apostrophes", "Dashes, hyphens...")

#: U+2212 MINUS SIGN is in the "Other math operators" section, which the
#: tables do not take. It is the one rule taken from there: a response
#: copied from formatted text often has it in place of `-`.
EXTRA_PUNCTUATION = {"−": "-"}

#: The `UNICODE_SPACE` class of docs/references/grammar.md.
UNICODE_SPACE = frozenset(
    [*range(0x09, 0x0E), 0x20, 0x85, 0xA0, 0x1680, *range(0x2000, 0x200B)]
    + [0x2028, 0x2029, 0x202F, 0x205F, 0x3000]
)

#: The C0 controls, U+007F and the C1 controls: general category `Cc`.
CONTROLS = frozenset([*range(0x00, 0x20), *range(0x7F, 0xA0)])

_RULE = re.compile(r"^(?P<source>\S+) → (?P<target>.*?) ; #")
_SECTION = re.compile(r"^# (?P<title>\S.*)$")
_ESCAPE = re.compile(r"\\u([0-9A-Fa-f]{4})|\\(.)|'((?:[^']|'')*)'")


class TablesError(Exception):
    """A source file does not have the expected content."""


def build_tables(sources: dict[str, str]) -> dict[str, Any]:
    """
    Build the tables from the text of the three source files.

    Args:
        sources: the text of each file of `SOURCES`, by the same keys.

    Raises:
        TablesError: a source file does not have the expected content.
    """
    ignorable = ignorable_ranges(sources["derived-core-properties"])
    ignored = {cp for first, last in ignorable for cp in range(first, last + 1)}
    sections = latin_ascii_sections(sources["latin-ascii"])

    letters = _merge_sections(sections, LETTER_SECTIONS)
    punctuation = _merge_sections(sections, PUNCTUATION_SECTIONS) | EXTRA_PUNCTUATION
    for table in (letters, punctuation):
        for source in [s for s in table if ord(s) in ignored]:
            # Ignorable code points are removed before the tables apply.
            del table[source]

    return {
        "unicode": UNICODE_VERSION,
        "cldr": CLDR_VERSION,
        "ignorable": ignorable,
        "letters": _sorted(letters),
        "punctuation": _sorted(punctuation),
        "caseFolding": _sorted(case_folding(sources["case-folding"])),
    }


def ignorable_ranges(derived_core_properties: str) -> list[list[int]]:
    """
    The inclusive ranges of the code points that the comparison removes:
    the controls that are not whitespace, and `Default_Ignorable_Code_Point`.
    """
    code_points = set(CONTROLS - UNICODE_SPACE)
    found = False
    for line in derived_core_properties.splitlines():
        fields = line.split("#")[0].split(";")
        if len(fields) != 2 or fields[1].strip() != "Default_Ignorable_Code_Point":
            continue
        found = True
        first, _, last = fields[0].strip().partition("..")
        code_points.update(range(int(first, 16), int(last or first, 16) + 1))
    if not found:
        raise TablesError("no Default_Ignorable_Code_Point in DerivedCoreProperties.txt")

    ranges: list[list[int]] = []
    for code_point in sorted(code_points):
        if ranges and ranges[-1][1] == code_point - 1:
            ranges[-1][1] = code_point
        else:
            ranges.append([code_point, code_point])
    return ranges


def latin_ascii_sections(latin_ascii: str) -> dict[str, dict[str, str]]:
    """
    The single code point rules of `Latin-ASCII.xml`, by section title.

    Raises:
        TablesError: a rule has a source or a target that this parser does
            not know how to read.
    """
    sections: dict[str, dict[str, str]] = {}
    current: dict[str, str] = {}
    for line in latin_ascii.splitlines():
        if title := _SECTION.match(line):
            current = sections.setdefault(title["title"], {})
        elif rule := _RULE.match(line):
            source = _unescape(rule["source"])
            target = _unescape(rule["target"])
            if len(source) != 1 or not target.isascii():
                raise TablesError(f"unexpected Latin-ASCII rule: {line!r}")
            current[source] = target
    return sections


def case_folding(case_folding_txt: str) -> dict[str, str]:
    """The full case folding: the `C` and `F` mappings of `CaseFolding.txt`."""
    table: dict[str, str] = {}
    for line in case_folding_txt.splitlines():
        fields = [field.strip() for field in line.split("#")[0].split(";")]
        if len(fields) < 3 or fields[1] not in ("C", "F"):
            continue
        table[chr(int(fields[0], 16))] = "".join(
            chr(int(code_point, 16)) for code_point in fields[2].split()
        )
    if not table:
        raise TablesError("no C or F mapping in CaseFolding.txt")
    return table


def _unescape(text: str) -> str:
    """Read the escapes of an ICU transform rule: `\\uXXXX`, `\\x` and `'...'`."""

    def replace(match: re.Match[str]) -> str:
        code_point, escaped, quoted = match.groups()
        if code_point is not None:
            return chr(int(code_point, 16))
        if escaped is not None:
            return escaped
        return quoted.replace("''", "'")

    return _ESCAPE.sub(replace, text)


def _merge_sections(sections: dict[str, dict[str, str]], titles: tuple[str, ...]) -> dict[str, str]:
    table: dict[str, str] = {}
    for title in titles:
        if not sections.get(title):
            raise TablesError(f"no rule in the Latin-ASCII section {title!r}")
        table |= sections[title]
    return table


def _sorted(table: dict[str, str]) -> dict[str, str]:
    return dict(sorted(table.items(), key=lambda item: ord(item[0])))


def download_sources() -> dict[str, str]:
    """Download the text of every file of `SOURCES`."""
    sources = {}
    for key, url in SOURCES.items():
        with urllib.request.urlopen(url, timeout=60) as response:
            sources[key] = response.read().decode("utf-8")
    return sources


def output_files(root: Path = MDQ_ROOT) -> tuple[list[Path], list[str]]:
    """
    Find where the tables go in the checkout at `root`.

    Returns:
        The output files, and the subtrees skipped because their package
        directory is not in the checkout.
    """
    files = [root / "docs" / "references" / TABLES_FILENAME]
    skipped = []
    for subtree, directory in SUBTREE_DIRS.items():
        if (root / directory).is_dir():
            files.append(root / directory / TABLES_FILENAME)
        else:
            skipped.append(subtree)
    return files, skipped


def _dump(tables: dict[str, Any]) -> str:
    """One JSON line per table: a diff then shows which table changed."""
    lines = [f"  {json.dumps(key)}: {json.dumps(value)}" for key, value in tables.items()]
    return "{\n" + ",\n".join(lines) + "\n}\n"


def main(argv: list[str] | None = None) -> int:
    """
    Entry point for `uv run scripts/inexact_tables.py`.

    Returns:
        The process exit code: 0 on success, 1 if `--check` finds a copy
        that differs or a source file is not as expected.
    """
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0].strip())
    parser.add_argument(
        "--check",
        action="store_true",
        help="write nothing; fail if a copy differs from docs/references/",
    )
    args = parser.parse_args(argv)
    files, skipped = output_files()
    for subtree in skipped:
        print(f"skipped {subtree}: not in this checkout")

    if args.check:
        reference = files[0].read_text(encoding="utf-8") if files[0].is_file() else None
        stale = [
            path
            for path in files
            if reference is None
            or not path.is_file()
            or path.read_text(encoding="utf-8") != reference
        ]
        for path in stale:
            print(f"out of date: {path.relative_to(MDQ_ROOT)}", file=sys.stderr)
        return 1 if stale else 0

    try:
        text = _dump(build_tables(download_sources()))
    except TablesError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    for path in files:
        path.write_text(text, encoding="utf-8")
        print(f"wrote {path.relative_to(MDQ_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
