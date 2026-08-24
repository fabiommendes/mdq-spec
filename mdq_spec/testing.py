from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_ROOT = ROOT / "mdq_spec" / "examples"
INVALID_DIR = EXAMPLES_ROOT / "invalid"
VALID_DIR = EXAMPLES_ROOT / "valid"
WARNINGS_DIR = EXAMPLES_ROOT / "warnings"
DOCUMENT_SUFFIXES = (".yaml", ".yml", ".json")
VALID_FILES: list[Path]
INVALID_FILES: list[Path]
WARNING_FILES: list[Path]


def collect_files(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.suffix.lower() in DOCUMENT_SUFFIXES
    )


def relative_id(path: Path) -> str:
    return ".".join(path.relative_to(EXAMPLES_ROOT).parts[1:])


INVALID_FILES = collect_files(INVALID_DIR)
VALID_FILES = collect_files(VALID_DIR)
WARNING_FILES = collect_files(WARNINGS_DIR)
