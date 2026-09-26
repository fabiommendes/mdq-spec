"""
Tests for `scripts/schema_bundle.py`.

Run from the repository root:

    uv run --with pytest --with PyYAML --with jsonschema pytest scripts
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

from schema_bundle import (
    MDQ_ROOT,
    TYPE_SCHEMAS,
    SchemaError,
    bundle_schemas,
    main,
    output_files,
    write_bundle,
)

SCRIPT = Path(__file__).resolve().parent / "schema_bundle.py"
BUNDLE = bundle_schemas()


def test_bundle_has_one_def_per_schema_file() -> None:
    expected = {p.stem for p in (MDQ_ROOT / "schema").glob("*.yaml")}
    assert set(BUNDLE["$defs"]) == expected


def test_bundle_oneof_covers_every_standalone_type() -> None:
    assert len(BUNDLE["oneOf"]) == len(TYPE_SCHEMAS)


def test_bundle_missing_schema_dir_raises() -> None:
    with pytest.raises(SchemaError):
        bundle_schemas(Path("/nonexistent/schema/dir"))


def test_bundle_rejects_an_invalid_schema(tmp_path: Path) -> None:
    for filename in TYPE_SCHEMAS.values():
        (tmp_path / filename).write_text(
            f"$id: https://example.com/{filename}\ntype: 42\n", encoding="utf-8"
        )
    with pytest.raises(SchemaError, match="not a valid JSON Schema"):
        bundle_schemas(tmp_path)


def test_write_bundle_round_trips(tmp_path: Path) -> None:
    output = tmp_path / "mdq.schema.json"
    written = write_bundle(output)
    assert json.loads(output.read_text(encoding="utf-8")) == written


def test_output_files_include_present_subtrees() -> None:
    files, skipped = output_files()
    assert MDQ_ROOT / "schema" / "mdq.schema.json" in files
    assert len(files) + len(skipped) == 3


def test_output_files_skip_missing_subtrees(tmp_path: Path) -> None:
    (tmp_path / "mdq-py" / "mdq").mkdir(parents=True)
    files, skipped = output_files(tmp_path)
    assert files == [
        tmp_path / "schema" / "mdq.schema.json",
        tmp_path / "mdq-py" / "mdq" / "mdq.schema.json",
    ]
    assert skipped == ["mdq-js"]


def test_main_writes_the_bundle(tmp_path: Path, capsys: pytest.CaptureFixture) -> None:
    output = tmp_path / "mdq.schema.json"
    assert main([str(output)]) == 0
    assert yaml.safe_load(output.read_text(encoding="utf-8")) == BUNDLE
    assert str(output) in capsys.readouterr().out


def test_main_reports_a_bad_schema_dir(
    tmp_path: Path, capsys: pytest.CaptureFixture
) -> None:
    output = tmp_path / "mdq.schema.json"
    assert main([str(output), "--schema-dir", "/nonexistent/schema/dir"]) == 2
    assert "error:" in capsys.readouterr().err
    assert not output.exists()


def test_check_passes_on_a_fresh_bundle(tmp_path: Path) -> None:
    output = tmp_path / "mdq.schema.json"
    write_bundle(output)
    assert main([str(output), "--check"]) == 0


def test_check_fails_on_a_stale_bundle(
    tmp_path: Path, capsys: pytest.CaptureFixture
) -> None:
    output = tmp_path / "mdq.schema.json"
    output.write_text("{}\n", encoding="utf-8")
    assert main([str(output), "--check"]) == 1
    assert "out of date" in capsys.readouterr().err
    assert output.read_text(encoding="utf-8") == "{}\n"


def test_check_fails_on_a_missing_bundle(tmp_path: Path) -> None:
    assert main([str(tmp_path / "mdq.schema.json"), "--check"]) == 1


def test_script_is_runnable(tmp_path: Path) -> None:
    output = tmp_path / "mdq.schema.json"
    result = subprocess.run(
        [sys.executable, str(SCRIPT), str(output)],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert yaml.safe_load(output.read_text(encoding="utf-8")) == BUNDLE
