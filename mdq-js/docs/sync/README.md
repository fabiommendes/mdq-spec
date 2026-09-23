This document describes the synchronization process between the MDQ and Python
implementations.

## Core principles

* Both implementations aim to maintain feature parity of core functionality:
  they have the same behavior, handle the same errors, and treat the same edge
  cases consistently.
* The Python implementation is the reference implementation and the
  authoritative source for correct behavior and edge case handling.
* Both implementations share a common set of test cases and validation rules to
  ensure consistency. They mostly consist of input-output pairs in a language
  agnostic format.
* The TypeScript is a port, but it DOES NOT strive to maintain the same APIs and
  interfaces. It should always use idiomatic TypeScript patterns and conventions
  as the Python implementation does for Python. That way we do not have to find
  a least common denominator between the two languages' idioms.
* The overall architecture and design is the same, and both implementations have
  roughly the same modules and a more or less one-to-one correspondence between
  types.

This document outlines how each specific part of the implementation is
mapped between Python and TypeScript.


## The stacks

This table summarizes the main tools and libraries used in both the Python and TypeScript implementations.

| Resource                          | Python      | TypeScript  |
| --------------------------------- | ----------- | ----------- |
| Markdown parsing                  | Markdown-it | Markdown-it |
| Data validation and serialization | Pydantic    | Zod         |
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
* Web usage - The TypeScript implements components for SolidJS. We are open
  to implementing support for other frameworks or libraries, but don't expect
  any work in that front if the community does not drive it.

## How is it organized

The reference docs at the root repository [docs/](../../docs/) are relevant to both
implementations and only describe the MDQ question formats. This is the
authorative source of truth both for Python and TypeScript implementations. If
the documents leave some room for interpretation, the Python implementation
takes precedence.

The porting scheme is describe in the documents in this repository.

| Document               | File                         | Status      |
| ---------------------- | ---------------------------- | ----------- |
| Core schemas and types | [schemas.md](schemas.md)     | written     |
| Testing                | [testing.md](testing.md)     | written     |
| Parsing                | `parsing.md`                 | not written |
| Rendering              | `rendering.md`               | not written |

The unwritten rows describe parts the TypeScript port has not reached yet.
It currently implements the schema layer, the validator, and the slugifier;
the parser and the SolidJS components are still to come.