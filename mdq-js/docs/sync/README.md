This document describes the synchronization between the Python and the
TypeScript implementations of MDQ.

## Core principles

* Both implementations aim to maintain feature parity of core functionality:
  they have the same behavior, handle the same errors, and treat the same edge
  cases consistently.
* The Python implementation is the reference implementation and the
  authoritative source for correct behavior and edge case handling.
* Both implementations share one test corpus in a language-agnostic format
  (`examples/`). A fact about the format is an example in the corpus, not a
  unit test on one side.
* The TypeScript is a port, but it DOES NOT strive to maintain the same APIs and
  interfaces. It should always use idiomatic TypeScript patterns and conventions
  as the Python implementation does for Python. That way we do not have to find
  a least common denominator between the two languages' idioms.
* The architecture is the same: one TypeScript module per Python module and a
  one-to-one correspondence between types. See [modules.md](modules.md).


## The stacks

This table summarizes the main tools and libraries used in both the Python and TypeScript implementations.

| Resource                          | Python      | TypeScript  |
| --------------------------------- | ----------- | ----------- |
| Markdown parsing                  | Markdown-it | Markdown-it |
| Data validation and serialization | Pydantic    | Zod         |
| Exact arithmetic                  | `fractions` | fraction.js |
| Testing framework                 | Pytest      | Vitest      |
| Property based testing            | Hypothesis  | Fast-check  |
| Linting                           | Ruff        | Biome       |
| YAML                              | PyYAML      | js-yaml     |
| Component Libraries               | -           | SolidJS *(planned)* |
| CLI                               | Typer       | -           |


## The main divergences

Functionality-wise the Python implementation is more geared to CLI use, servers
and scripting and TypeScript is more focused on web usage.

* CLI - Only the Python package provides a CLI tool. We think it is not worth
  the effort to replicate it in TypeScript since for CLI users the
  implementation language is mostly irrelevant.
* Format conversions - Similarly, only the Python implementation provides
  built-in support for converting between different formats (e.g., Moodle
  question formats). This is integrated into the CLI and not available to JS
  either.
* Rendering - Only Python writes MDQ Markdown back (`render()`,
  `frontmatter()`).
* File-system question bank - Only Python has `FileLoader`. TypeScript has
  `DictLoader` and the `QuestionBank` interface.
* Web usage - The TypeScript implements components for SolidJS. We are open
  to implementing support for other frameworks or libraries, but don't expect
  any work in that front if the community does not drive it.

## How is it organized

The reference docs at the root repository [docs/](../../../docs/) are relevant
to both implementations and only describe the MDQ question formats. This is
the authoritative source of truth both for Python and TypeScript
implementations. If the documents leave some room for interpretation, the
Python implementation takes precedence.

The porting scheme is described in the documents in this directory.

| Document               | File                     |
| ---------------------- | ------------------------ |
| Modules and API        | [modules.md](modules.md) |
| Core schemas and types | [schemas.md](schemas.md) |
| Testing                | [testing.md](testing.md) |
| Decisions and phases   | [roadmap.md](roadmap.md) |
