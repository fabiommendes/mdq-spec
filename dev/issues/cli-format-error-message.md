---
type: issue
status: todo
tags: [mdq-py, cli, diagnostics]
relatedTo: [mdq-py/mdq/_loading.py, mdq-py/mdq/cli/_show.py, mdq-py/mdq/cli/_validate.py]
---

# CLI: unknown suffix error refers to `format=`; exit codes differ

Found in the mdq-py architecture review (cli B3).

```console
$ mdq show q.txt
error: cannot infer a format from q.txt; pass format= explicitly (expected one of ('.md', '.mdq', '.yaml', '.yml', '.json'))
$ echo $?
1
$ mdq validate q.txt; echo $?
error: cannot infer a format ...
2
```

- Expected: a CLI message refers to a CLI option, and the same failure gives
  the same exit code in every command.
- Actual: `format=` is the library keyword; `show` has no `--format` option.
  `show` exits 1, `validate` exits 2.
- Cause: the `ValueError` text comes from `mdq-py/mdq/_loading.py:226-230`
  and the CLI prints it as is. `show` maps `ValueError` to exit 1
  (`mdq-py/mdq/cli/_show.py:903-905`); `validate` maps it to exit 2
  (`mdq-py/mdq/cli/_validate.py:63-65`).
- Related: the `show` FILE help (`_show.py:839`) says `(.mdq.md, .md or
  .mdq)`, but `show` also reads `.yaml`, `.yml` and `.json`.
- Fix: raise a dedicated error for an unknown suffix, let each command word
  it, use exit 2 (usage error) in both; fix the help text.
- Changes external behavior: yes (message and `show` exit code).
- Not testable via the corpus: add CLI tests.
