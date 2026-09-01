from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAMPLES_ROOT = ROOT / "mdq" / "examples"
INVALID_DIR = EXAMPLES_ROOT / "invalid"
VALID_DIR = EXAMPLES_ROOT / "valid"
WARNINGS_DIR = EXAMPLES_ROOT / "warnings"
DOCUMENT_SUFFIXES = (".yaml", ".yml", ".json")
VALID_EXAMS_DIR = VALID_DIR / "exam"

#: Surface-syntax questions. A question and an exam share this extension
#: and are told apart by their content, not by their name.
SOURCE_SUFFIX = ".mdq.md"
VALID_SOURCES: list[Path]
VALID_PARSED: list[Path]
INVALID_PARSED: list[Path]
WARNING_PARSED: list[Path]


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


def collect_sources(root: Path) -> list[Path]:
    if not root.exists():
        return []
    return sorted(
        path
        for path in root.rglob("*")
        if path.is_file() and path.name.endswith(SOURCE_SUFFIX)
    )


#: The .yaml a source document is expected to parse into.
def parsed_sibling(source: Path) -> Path:
    return source.with_name(source.name[: -len(SOURCE_SUFFIX)] + ".yaml")


INVALID_PARSED = collect_files(INVALID_DIR)
VALID_PARSED = collect_files(VALID_DIR)
WARNING_PARSED = collect_files(WARNINGS_DIR)
VALID_SOURCES = collect_sources(VALID_DIR)
VALID_QUESTIONS = [
    source for source in VALID_SOURCES if not source.is_relative_to(VALID_EXAMS_DIR)
]
VALID_EXAMS = [
    source for source in VALID_SOURCES if source.is_relative_to(VALID_EXAMS_DIR)
]
