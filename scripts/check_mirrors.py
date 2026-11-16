"""
Check that each subtree mirror on GitHub has the same content as its directory.

`git subtree push` writes commits whose tree is the tree of the subtree
directory. So a mirror is current when `git rev-parse HEAD:<dir>` equals the
tree of the mirror's `main`. Comparing trees needs no history, so it works on
the shallow checkout of CI, and it costs one `git fetch --depth=1` per mirror
(a `git subtree split` would need the full history).

Run it from the repository root:

    python3 scripts/check_mirrors.py [mdq-py mdq-js mdq-vscode]

With no arguments it checks the three mirrors. It exits with 1 when one of them
is behind, or ahead, of this repository, and prints the `git subtree push`
command that fixes it. `--warn` prints the same message and exits with 0.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

MIRRORS = ("mdq-py", "mdq-js", "mdq-vscode")


def mirror_url(name: str) -> str:
    """Return the public HTTPS URL of the mirror of a subtree."""
    return f"https://github.com/fabiommendes/{name}.git"


def _git(*args: str, root: Path = ROOT) -> str:
    return subprocess.run(["git", *args], cwd=root, check=True, capture_output=True, text=True).stdout.strip()


def local_tree(name: str, root: Path = ROOT) -> str:
    """Return the tree hash of the subtree directory at HEAD."""
    return _git("rev-parse", f"HEAD:{name}", root=root)


def remote_tree(name: str, root: Path = ROOT) -> str:
    """Return the tree hash of `main` in the mirror, fetched with depth 1."""
    _git("fetch", "--quiet", "--depth=1", "--no-tags", mirror_url(name), "main", root=root)
    return _git("rev-parse", "FETCH_HEAD^{tree}", root=root)


def problem(name: str, local: str, remote: str) -> str | None:
    """Return the message for a mirror that differs from its directory, else None."""
    if local == remote:
        return None
    return (
        f"{name}: mirror differs from {name}/ (local tree {local[:10]}, mirror tree {remote[:10]}). "
        f"Run: git subtree push --prefix={name} {name} main"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("names", nargs="*", choices=MIRRORS)
    parser.add_argument("--warn", action="store_true", help="report differences but exit with 0")
    args = parser.parse_args(argv)
    problems: list[str] = []
    for name in args.names or MIRRORS:
        msg = problem(name, local_tree(name), remote_tree(name))
        if msg is None:
            print(f"{name}: mirror is current")
        else:
            problems.append(msg)
    for msg in problems:
        print(("warning: " if args.warn else "") + msg, file=sys.stderr)
    return 1 if problems and not args.warn else 0


if __name__ == "__main__":
    sys.exit(main())
