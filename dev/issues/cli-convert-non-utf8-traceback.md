---
type: issue
status: todo
tags: [mdq-py, cli, convert]
relatedTo: [mdq-py/mdq/cli/_convert.py]
---

# `mdq import` / `mdq export` crash on non-UTF-8 input

Found in the mdq-py architecture review (cli B4).

```console
$ printf '\xff\xfe' > bad.aiken
$ mdq import bad.aiken
... Rich traceback ...
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xff in position 0: invalid start byte
```

- Expected: `error: ...` on stderr and a usage exit code (2), as `show` and
  `validate` do for an unreadable file.
- Actual: a traceback (exit 1). A missing file is already handled by typer.
- Cause: `file.read_text(...)` is outside the `try` in `import_`
  (`mdq-py/mdq/cli/_convert.py:59`) and `export` (:102).
- Fix: catch `UnicodeDecodeError` (and `OSError`) around the read.
- Changes external behavior: yes (message and exit code).
- Not testable via the corpus: add CLI tests.
