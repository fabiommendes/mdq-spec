"""
Tests for `scripts/inexact_tables.py`.

Run from the repository root:

    uv run --no-project --with pytest --with PyYAML --with jsonschema pytest scripts

The tests do not use the network: they build the tables from small samples
of the source files.
"""

from __future__ import annotations

import json

import pytest

from inexact_tables import (
    MDQ_ROOT,
    TABLES_FILENAME,
    TablesError,
    build_tables,
    case_folding,
    ignorable_ranges,
    latin_ascii_sections,
    main,
    output_files,
)

LATIN_ASCII = """\
# Latin letters and IPA
#
Æ → AE ; # 00C6;LATIN CAPITAL LETTER AE
ø → o ; # 00F8;LATIN SMALL LETTER O WITH STROKE
ŉ → \\'n ; # 0149;LATIN SMALL LETTER N PRECEDED BY APOSTROPHE
#
# Latin extended C and D (later addition)
#
Ⱡ → L ; # 2C60;LATIN CAPITAL LETTER L WITH DOUBLE BAR
#
# Quotes, apostrophes
#
’ → \\' ; # 2019;RIGHT SINGLE QUOTATION MARK
« → '<<' ; # 00AB;LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
#
# Dashes, hyphens...
#
\\u00AD → '-' ; # 00AD;SOFT HYPHEN
– → '-' ; # 2013;EN DASH
#
# Other math operators (non-ASCII-range)
#
× → '*' ; # 00D7;MULTIPLICATION SIGN
"""

CASE_FOLDING = """\
# CaseFolding-18.0.0.txt
0041; C; 0061; # LATIN CAPITAL LETTER A
00DF; F; 0073 0073; # LATIN SMALL LETTER SHARP S
0130; T; 0069; # LATIN CAPITAL LETTER I WITH DOT ABOVE
1E9E; S; 00DF; # LATIN CAPITAL LETTER SHARP S
1E9E; F; 0073 0073; # LATIN CAPITAL LETTER SHARP S
"""

DERIVED_CORE_PROPERTIES = """\
00AD          ; Default_Ignorable_Code_Point # Cf       SOFT HYPHEN
200B..200F    ; Default_Ignorable_Code_Point # Cf   [5] ZERO WIDTH SPACE..RIGHT-TO-LEFT MARK
0041..005A    ; Uppercase # L&  [26] LATIN CAPITAL LETTER A..LATIN CAPITAL LETTER Z
"""

SOURCES = {
    "latin-ascii": LATIN_ASCII,
    "case-folding": CASE_FOLDING,
    "derived-core-properties": DERIVED_CORE_PROPERTIES,
}


def test_ignorable_has_the_controls_that_are_not_whitespace() -> None:
    ranges = ignorable_ranges(DERIVED_CORE_PROPERTIES)
    assert ranges[:4] == [[0x00, 0x08], [0x0E, 0x1F], [0x7F, 0x84], [0x86, 0x9F]]


def test_ignorable_has_the_default_ignorable_code_points() -> None:
    ranges = ignorable_ranges(DERIVED_CORE_PROPERTIES)
    assert ranges[4:] == [[0xAD, 0xAD], [0x200B, 0x200F]]


def test_ignorable_needs_the_property_in_the_source() -> None:
    with pytest.raises(TablesError):
        ignorable_ranges("0041..005A ; Uppercase # L&\n")


def test_latin_ascii_rules_are_read_by_section() -> None:
    sections = latin_ascii_sections(LATIN_ASCII)
    assert sections["Latin letters and IPA"] == {"Æ": "AE", "ø": "o", "ŉ": "'n"}
    assert sections["Quotes, apostrophes"] == {"’": "'", "«": "<<"}
    assert sections["Dashes, hyphens..."] == {"­": "-", "–": "-"}


def test_latin_ascii_rule_with_a_long_source_is_an_error() -> None:
    with pytest.raises(TablesError):
        latin_ascii_sections("# Latin letters and IPA\nab → c ; # two code points\n")


def test_case_folding_takes_the_common_and_full_mappings() -> None:
    assert case_folding(CASE_FOLDING) == {"A": "a", "ß": "ss", "ẞ": "ss"}


def test_tables_merge_the_sections_and_skip_ignorable_sources() -> None:
    tables = build_tables(SOURCES)
    assert tables["letters"] == {"Æ": "AE", "ø": "o", "ŉ": "'n", "Ⱡ": "L"}
    # U+00AD is ignorable, so its rule never applies. U+2212 is added.
    assert tables["punctuation"] == {"«": "<<", "–": "-", "’": "'", "−": "-"}
    assert "×" not in tables["punctuation"]


def test_tables_need_every_section() -> None:
    sources = SOURCES | {"latin-ascii": "# Latin letters and IPA\nø → o ; # 00F8\n"}
    with pytest.raises(TablesError):
        build_tables(sources)


def test_every_copy_in_the_checkout_is_up_to_date() -> None:
    files, _ = output_files()
    assert files[0] == MDQ_ROOT / "docs" / "references" / TABLES_FILENAME
    assert main(["--check"]) == 0


def test_the_tables_file_is_ascii_json_with_the_four_tables() -> None:
    text = (MDQ_ROOT / "docs" / "references" / TABLES_FILENAME).read_text(encoding="utf-8")
    assert text.isascii()
    tables = json.loads(text)
    assert set(tables) == {"unicode", "cldr", "ignorable", "letters", "punctuation", "caseFolding"}
    assert tables["letters"]["ø"] == "o"
    assert tables["punctuation"]["’"] == "'"
    assert tables["caseFolding"]["ß"] == "ss"
    assert [0x200B, 0x200F] in tables["ignorable"]
