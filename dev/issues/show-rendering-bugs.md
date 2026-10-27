---
type: issue
status: todo
tags: [mdq-py, cli, show, fill-in]
relatedTo: [mdq-py/mdq/cli/_show.py, mdq-py/mdq/cli/_show_theme.py, docs/question-types/fill-in.md, dev/issues/moodle-export-blank-in-code.md]
---

# `mdq show` rendering bugs

Found in the mdq-py architecture review (cli B1, B2, B5). All three are in
the terminal renderer; none changes the parsed model.

## Non-blanks shown as blank fields (cli B1)

```md
Complete: a capital do Brasil é [^capital].

Em código: `[^capital]` e link [^capital](https://x.org).

    [^capital] indented code

[^capital/short-answer]: Brasília
```

- `mdq validate` says OK. `mdq show --theme plain` draws all four markers as
  `_ capital` chips; the link one prints `(https://x.org)` as text.
- Expected: code is literal text and `[^x](url)` is a link
  (`docs/question-types/fill-in.md`, "Where blanks may appear").
- Cause: `_BLANK_REF` (`mdq-py/mdq/cli/_show.py:64`) is a third, looser copy
  of the blank regex. `_mark_blanks` (:426-442) skips fenced lines only.
- Fix: use the token walk of `mdq._markdown.find_blank_markers`, extended to
  return marker positions. The Moodle export has the same root cause
  (`dev/issues/moodle-export-blank-in-code.md`); fix both with one helper.

## ANSI codes on a piped stderr (cli B2)

- `mdq show q.txt 2>&1 | cat -v` prints `^[[1;31merror:^[[0m ...`, and Rich
  hard-wraps the message at 80 columns.
- Expected: the comment at `_show.py:873` ("a pipe or a file gets no escape
  codes").
- Cause: `error_console` (`_show.py:882-885`) uses `force_terminal=True`.
  `test_show.py:454` checks stdout only.
- Fix: let Rich detect the terminal for stderr, and do not wrap error text.

## `--theme plain` is not colorless (cli B5)

- A fenced or indented code block under `--theme plain` emits a truecolor
  background (`48;2;248;248;248`).
- Expected: the `--theme` help ("plain (ASCII, no colors)") and the module
  docstring.
- Cause: `_PLAIN` (`mdq-py/mdq/cli/_show_theme.py:240-248`) keeps the default
  `code_theme`.
- Fix: give `plain` a code theme with no colors.

Changes external behavior: yes (CLI output only). Not testable via the
corpus: add CLI tests in `mdq-py/tests/test_show.py`.
