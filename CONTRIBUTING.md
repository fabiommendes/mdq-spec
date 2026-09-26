# Contributing to MDQ

Thank you for your interest in MDQ. This document explains how the
repositories are organized and how to propose a change.

## Repositories

| Repository                                          | Contents                            |
| --------------------------------------------------- | ----------------------------------- |
| [mdq-spec](https://github.com/fabiommendes/mdq-spec) | Specification, schema and examples |
| [mdq-py](https://github.com/fabiommendes/mdq-py)     | Python reference implementation    |
| [mdq-js](https://github.com/fabiommendes/mdq-js)     | TypeScript port                    |

mdq-spec contains the two implementations as
[git subtrees](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging#_subtree_merge)
in `mdq-py/` and `mdq-js/`. Their test suites read `docs/`, `schema/` and
`examples/` from mdq-spec, so work in a clone of mdq-spec. Open issues and pull
requests there too.

## Order of changes

1. **Specification.** Change the syntax in `docs/`, the schema in `schema/`
   and add examples to `examples/`. Run `uv run scripts/schema_bundle.py`
   after you change a schema.
2. **Python.** Implement the change in `mdq-py/`. It is the reference for
   correct behavior.
3. **TypeScript.** Port the change to `mdq-js/`.

A pull request can stop after any step. For a large change, open an issue
first to discuss the design.

## Examples

Every document in `examples/valid/` has the expected parse result next to it:
`name.mdq.md` goes with `name.yaml`, and optionally `name.lint.json` for the
expected warnings. Documents in `examples/invalid/` must be rejected.

For the content of new examples, we prefer themes from Brazilian culture,
history and geography, or established scientific facts. Avoid religion,
politics and football.

## Checks

The CI runs these commands. Run them before you open a pull request:

```bash
uv run scripts/schema_bundle.py --check

cd mdq-py
uv run pytest
uv run mypy mdq

cd ../mdq-js
pnpm install
pnpm test
pnpm typecheck
pnpm lint
```

## Commits

Keep each commit inside one subtree (`mdq-py/` or `mdq-js/`) when you can. A
commit that also changes the root appears in the history of the subtree
repository with a message that describes changes it does not contain.

## Code of conduct

Everyone who participates in this project must follow the
[code of conduct](CODE_OF_CONDUCT.md).
