"""
Tests for the frontmatter step of `scripts/spec_audit.py`.

Run from the repository root:

    uv run --with pytest --with PyYAML --with jsonschema --with markdown-it-py \
        --with mdit-py-plugins pytest scripts
"""

from __future__ import annotations

from pathlib import Path

import pytest
import spec_audit
from spec_audit import (
    check_frontmatter,
    PropertyDef,
    Rule,
    check_rule_field,
    collect_properties,
    either_values,
    expand_braces,
    parse_field_paths,
    property_conflicts,
    stale_property_entries,
    schema_path_exists,
    load_schema,
    parse_doc_type,
    resolve_ref,
    schema_atoms,
    schema_properties,
    types_agree,
)

STRING = ("type", "string")


@pytest.mark.parametrize(
    "text, expected",
    [
        ("string", {STRING}),
        ("map", {("type", "object")}),
        ("object", {("type", "object")}),
        ('"numeric"', {("lit", "numeric")}),
        ("string[]", {("array", frozenset({STRING}))}),
        ("string[] or string", {("array", frozenset({STRING})), STRING}),
        ('boolean or "inherit"', {("type", "boolean"), ("lit", "inherit")}),
        (
            '"none", "capped" or "full"',
            {("lit", "none"), ("lit", "capped"), ("lit", "full")},
        ),
        ("pattern-list", {("ref", "patternlist")}),
        ("Normalization[]", {("array", frozenset({("ref", "normalization")}))}),
    ],
)
def test_parse_doc_type(text: str, expected: set) -> None:
    assert parse_doc_type(text) == expected


@pytest.mark.parametrize("text", ["", "a b", "string[", '"open', "1st"])
def test_parse_doc_type_rejects_unknown_syntax(text: str) -> None:
    with pytest.raises(ValueError):
        parse_doc_type(text)


@pytest.fixture
def schemas(tmp_path: Path) -> Path:
    (tmp_path / "base.yaml").write_text(
        "properties:\n  id: {type: string}\n$defs:\n  Tag: {enum: [a, b]}\n"
    )
    (tmp_path / "child.yaml").write_text(
        """
allOf:
  - $ref: ./base.yaml
  - properties:
      kind: {const: child}
      tag: {$ref: "./base.yaml#/$defs/Tag"}
      local: {$ref: "#/$defs/Local"}
properties:
  top: {type: integer}
$defs:
  Local: {type: array, items: {type: number}}
"""
    )
    return tmp_path / "child.yaml"


def test_resolve_ref_in_another_file(schemas: Path) -> None:
    node, path, name = resolve_ref("./base.yaml#/$defs/Tag", schemas)
    assert node == {"enum": ["a", "b"]}
    assert (path.name, name) == ("base.yaml", "Tag")


def test_resolve_ref_in_the_same_file(schemas: Path) -> None:
    node, path, name = resolve_ref("#/$defs/Local", schemas)
    assert node["type"] == "array"
    assert (path, name) == (schemas.resolve(), "Local")


def test_resolve_ref_to_a_whole_file(schemas: Path) -> None:
    _, path, name = resolve_ref("./base.yaml", schemas)
    assert (path.name, name) == ("base.yaml", "base")


def test_schema_properties_inherit_through_allof(schemas: Path) -> None:
    props = schema_properties(load_schema(schemas), schemas)
    assert set(props) == {"id", "kind", "tag", "local", "top"}
    assert props["id"][1].name == "base.yaml"


def test_schema_properties_without_inheritance(schemas: Path) -> None:
    props = schema_properties(load_schema(schemas), schemas, inherit=False)
    assert set(props) == {"kind", "tag", "local", "top"}


def test_schema_atoms_of_refs(schemas: Path) -> None:
    props = schema_properties(load_schema(schemas), schemas)
    node, path = props["tag"]
    assert schema_atoms(node, path, deref=False) == {("ref", "tag")}
    assert schema_atoms(node, path, deref=True) == {("lit", "a"), ("lit", "b")}
    node, path = props["local"]
    assert schema_atoms(node, path, deref=True) == {
        ("array", frozenset({("type", "number")}))
    }


def test_types_agree_with_a_string_enum() -> None:
    schema = frozenset({("lit", "a"), ("lit", "b")})
    assert types_agree(frozenset({STRING}), schema, "x")
    assert types_agree(frozenset({("lit", "a"), ("lit", "b")}), schema, "x")
    assert not types_agree(frozenset({("lit", "a")}), schema, "x")
    assert not types_agree(frozenset({("type", "integer")}), schema, "x")


def test_types_agree_with_a_named_inline_enum() -> None:
    schema = frozenset({("lit", "a"), ("lit", "b")})
    assert types_agree(frozenset({("ref", "grading")}), schema, "grading")
    assert not types_agree(frozenset({("ref", "other")}), schema, "grading")


def test_types_agree_compares_array_items() -> None:
    doc = frozenset({("array", frozenset({("ref", "tolerance")}))})
    ok = frozenset({("array", frozenset({("ref", "tolerance")}))})
    other = frozenset({("array", frozenset({STRING}))})
    assert types_agree(doc, ok, "x")
    assert not types_agree(doc, other, "x")


def test_types_agree_requires_every_alternative() -> None:
    doc = frozenset({("array", frozenset({STRING})), STRING})
    assert not types_agree(doc, frozenset({("array", frozenset({STRING}))}), "tags")


def test_either_values() -> None:
    assert either_values('Either "fold" (the default) or "keep"[^2]') == {
        "fold",
        "keep",
    }
    assert either_values('Either "a" or "b": what "c" does') == {"a", "b"}
    assert either_values('Programming language of "code" inputs') == set()


@pytest.fixture
def frontmatter_doc(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """A doc `demo.md` whose table has a `tags` shorthand row and a `size` row."""
    (tmp_path / "schema").mkdir()
    (tmp_path / "schema" / "demo.yaml").write_text(
        "properties:\n  tags: {type: array, items: {type: string}}\n"
        "  size: {type: integer}\n"
    )
    doc = tmp_path / "demo.md"
    doc.write_text(
        "## Frontmatter\n\n"
        "| Field | Type | Description |\n"
        "| ----- | ---- | ----------- |\n"
        "| tags  | string | Comma delimited. |\n"
        "| size  | integer | The size. |\n"
    )
    monkeypatch.setattr(spec_audit, "MDQ_ROOT", tmp_path)
    monkeypatch.setattr(spec_audit, "SCHEMA_DIR", tmp_path / "schema")
    return doc


def run_check_frontmatter(doc: Path) -> list[str]:
    problems: list[str] = []
    check_frontmatter(doc, problems)
    return problems


def test_frontmatter_mismatch_is_reported_without_allowlist(
    frontmatter_doc: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(spec_audit, "FRONTMATTER_SHORTHANDS", {})
    problems = run_check_frontmatter(frontmatter_doc)
    assert len(problems) == 1
    assert "`tags` is 'string'" in problems[0]


def test_frontmatter_shorthand_skips_the_checks(
    frontmatter_doc: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        spec_audit, "FRONTMATTER_SHORTHANDS", {("demo", "tags"): "shorthand"}
    )
    assert run_check_frontmatter(frontmatter_doc) == []


def test_frontmatter_shorthand_skips_fields_missing_from_the_schema(
    frontmatter_doc: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    frontmatter_doc.write_text(
        frontmatter_doc.read_text() + "| extra | map | Not in the schema. |\n"
    )
    monkeypatch.setattr(
        spec_audit,
        "FRONTMATTER_SHORTHANDS",
        {("demo", "tags"): "x", ("demo", "extra"): "y"},
    )
    assert run_check_frontmatter(frontmatter_doc) == []


def test_frontmatter_stale_shorthand_is_reported(
    frontmatter_doc: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        spec_audit,
        "FRONTMATTER_SHORTHANDS",
        {("demo", "tags"): "x", ("demo", "gone"): "y"},
    )
    problems = run_check_frontmatter(frontmatter_doc)
    assert len(problems) == 1
    assert "`gone`" in problems[0] and "allowlisted" in problems[0]


def test_frontmatter_shorthand_of_another_doc_is_ignored(
    frontmatter_doc: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(spec_audit, "FRONTMATTER_SHORTHANDS", {("other", "tags"): "x"})
    problems = run_check_frontmatter(frontmatter_doc)
    assert len(problems) == 1
    assert "`tags` is 'string'" in problems[0]


def test_expand_braces() -> None:
    assert expand_braces("a") == ["a"]
    assert expand_braces("q[].{x,y, z}") == ["q[].x", "q[].y", "q[].z"]


@pytest.mark.parametrize(
    "text, expected",
    [
        ("answer", [["answer"]]),
        ("tolerance.absolute", [["tolerance", "absolute"]]),
        ("choices[].id", [["choices", "[]", "id"]]),
        ("accept, reject", [["accept"], ["reject"]]),
        (
            "questions[].{stem,epilogue}",
            [["questions", "[]", "stem"], ["questions", "[]", "epilogue"]],
        ),
        ("include-all", [["include-all"]]),
    ],
)
def test_parse_field_paths(text: str, expected: list) -> None:
    assert parse_field_paths(text) == expected


@pytest.mark.parametrize("text", ["", "a..b", "a b", "[]"])
def test_parse_field_paths_rejects_unknown_syntax(text: str) -> None:
    with pytest.raises(ValueError):
        parse_field_paths(text)


@pytest.fixture
def path_schema(tmp_path: Path) -> tuple[Path, dict]:
    path = tmp_path / "doc.yaml"
    path.write_text(
        """
properties:
  answer: {type: string}
  tolerance: {$ref: "#/$defs/Tolerance"}
  blanks:
    type: array
    items:
      oneOf:
        - properties: {unit: {type: string}}
        - properties: {other: {type: string}}
$defs:
  Tolerance:
    properties: {absolute: {type: number}}
"""
    )
    return path, load_schema(path)


@pytest.mark.parametrize(
    "segments, exists",
    [
        (["answer"], True),
        (["missing"], False),
        (["tolerance", "absolute"], True),
        (["tolerance", "relative"], False),
        (["blanks", "[]", "unit"], True),
        (["blanks", "[]", "other"], True),
        (["blanks", "unit"], False),
        (["answer", "[]"], False),
    ],
)
def test_schema_path_exists(
    path_schema: tuple[Path, dict], segments: list[str], exists: bool
) -> None:
    path, root = path_schema
    assert schema_path_exists(root, path, segments) is exists


def test_check_rule_field(
    path_schema: tuple[Path, dict], monkeypatch: pytest.MonkeyPatch
) -> None:
    path, root = path_schema
    monkeypatch.setattr(spec_audit, "MDQ_ROOT", path.parent)
    doc = path.parent / "doc.md"
    monkeypatch.setattr(spec_audit, "FRONTMATTER_SHORTHANDS", {("doc", "short"): "x"})

    def check(field: str) -> str | None:
        return check_rule_field(Rule(doc, field, "critical", "c", "r", 7), path, root)

    assert check("answer, blanks[].unit") is None
    assert check("body") is None
    assert check("short, answer") is None
    assert check("answer, nope") == (
        "doc.md:7: field `answer, nope` is not a path of schema/doc.yaml"
    )


def test_collect_properties_finds_nested_and_defs(
    path_schema: tuple[Path, dict], monkeypatch: pytest.MonkeyPatch
) -> None:
    path, _ = path_schema
    monkeypatch.setattr(spec_audit, "MDQ_ROOT", path.parent)
    names = {d.name: d.where for d in collect_properties(path)}
    assert names["answer"] == "doc.yaml#/properties/answer"
    assert names["absolute"] == "doc.yaml#/$defs/Tolerance/properties/absolute"
    assert names["unit"] == "doc.yaml#/properties/blanks/items/oneOf/0/properties/unit"


def prop(name: str, where: str, *atoms) -> PropertyDef:
    return PropertyDef(name, where, frozenset(atoms))


def test_property_conflicts() -> None:
    defs = [
        prop("id", "a#/id", STRING),
        prop("id", "b#/id", STRING),
        prop("max", "a#/max", ("type", "integer")),
        prop("max", "b#/max", STRING),
        prop("type", "a#/type", ("lit", "x")),
        prop("type", "b#/type", ("lit", "y")),
        prop("grading", "a#/grading", STRING),
        prop("grading", "b#/grading", ("type", "object")),
    ]
    problems = property_conflicts(defs, ignored={"grading"})
    assert len(problems) == 1
    assert problems[0].startswith("property `max` has different types: a#/max")
    assert "b#/max is string" in problems[0]


def test_property_conflicts_ignore_inherit() -> None:
    defs = [
        prop("shuffle", "a#/shuffle", ("lit", "none"), ("lit", "inherit")),
        prop("shuffle", "b#/shuffle", ("lit", "none")),
    ]
    assert property_conflicts(defs, ignored=set()) == []


def test_property_conflicts_allowlist(monkeypatch: pytest.MonkeyPatch) -> None:
    defs = [
        prop("accept", "a#/accept", STRING),
        prop("accept", "b#/accept", ("type", "object")),
    ]
    monkeypatch.setattr(spec_audit, "POLYMORPHIC_PROPERTIES", {"accept": "why"})
    monkeypatch.setattr(spec_audit, "NAMING_EXCEPTIONS", {})
    assert property_conflicts(defs, ignored=set()) == []
    assert stale_property_entries(defs, set()) == []


def test_stale_property_entries(monkeypatch: pytest.MonkeyPatch) -> None:
    defs = [
        prop("same", "a#/same", STRING),
        prop("same", "b#/same", STRING),
        prop("camel", "a#/camel", STRING),
    ]
    monkeypatch.setattr(
        spec_audit, "POLYMORPHIC_PROPERTIES", {"same": "x", "gone": "x"}
    )
    monkeypatch.setattr(
        spec_audit, "NAMING_EXCEPTIONS", {"camel": "x", "gone-too": "x"}
    )
    problems = stale_property_entries(defs, set())
    assert len(problems) == 4
    assert any("`same` has the same type" in p for p in problems)
    assert any("`gone` is not a property" in p for p in problems)
    assert any("`camel` is already camelCase" in p for p in problems)
    assert any("`gone-too` is not a property" in p for p in problems)
