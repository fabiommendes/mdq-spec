# MDQ: Markdown Questions

[![CI](https://github.com/fabiommendes/mdq-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/fabiommendes/mdq-spec/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [!WARNING]
> This is a work in progress. The specification is not stable yet and may
> change. The reference implementations are also under development and may not
> support every feature described here.

MDQ is a file format to write questions and exams in plain Markdown. It has
the same scope as formats like [GIFT](https://docs.moodle.org/en/GIFT_format)
and [Aiken](https://docs.moodle.org/en/Aiken_format), but it uses Markdown
idioms that people (and LLMs) already know: task lists, footnote references,
YAML frontmatter.

```md
What is the capital of Brazil?

* [ ] Rio de Janeiro
  > It was the capital until 1960.
* [*] Brasília
* [ ] São Paulo
```

An MDQ file renders as a readable document in any Markdown viewer, and a parser
turns it into structured data (JSON/YAML) that a learning management system can
use to show, grade and export the question.

This repository holds the specification: the syntax, the JSON Schema of the
parsed documents, and a shared test corpus. Two implementations live next to
it:

| Package                                          | Language   | Provides                                                         |
| ------------------------------------------------ | ---------- | ---------------------------------------------------------------- |
| [mdq-py](https://github.com/fabiommendes/mdq-py) | Python     | Reference implementation: parser, linter, grading and `mdq` CLI  |
| [mdq-js](https://github.com/fabiommendes/mdq-js) | TypeScript | Port of the parser and validators, for use in the browser        |


## Contents

* [File format](#file-format)
* [Question types](#question-types)
* [Exams](#exams)
* [Tools](#tools)
* [Repository layout](#repository-layout)
* [Contributing](#contributing)
* [License](#license)


## File format

MDQ files use the `.mdq.md` or `.mdq` extension. Prefer `.mdq.md`: editors and
forges that key off `.md` then treat the file as Markdown. A file holds either
one question or one exam, and the parser tells them apart by content.

A question has up to four parts, in this order:

```md
---
# Optional YAML frontmatter. This first comment block is kept as a comment.
id: capital-br
title: Capital of Brazil
tags: geography, brazil
locale: en
---

Optional preamble: any number of paragraphs, tables, images or code blocks
that give context to the question.

What is the capital of Brazil?

* [ ] Rio de Janeiro
* [*] Brasília
* [ ] São Paulo

Optional epilogue, shown after the body.
```

* **Frontmatter**: optional metadata. Common fields are `id`, `title`, `tags`,
  `author`, `locale`, `weight` and `type`. Each question type adds its own.
* **Stem**: the last paragraph before the body. It tells the student what to do.
  Write `...` to use the default instruction of the question type.
* **Body**: the answer area. Its syntax decides the question type, so `type` is
  rarely necessary.
* **Epilogue**: optional blocks after the body.

A `[slug]` at the start of the first paragraph sets the id, as in
`[Q1] What is the capital of Brazil?`. See
[docs/question-types/base.md](docs/question-types/base.md) for the full rules.


## Question types

| Type                                                         | Body                              |
| ------------------------------------------------------------ | --------------------------------- |
| [Multiple choice](docs/question-types/multiple-choice.md)    | `* [ ]` / `* [*]` list            |
| [Multiple selection](docs/question-types/multiple-selection.md) | `* [ ]` / `* [x]` list         |
| [True/false](docs/question-types/true-false.md)              | `* [T]` / `* [F]` list            |
| [Short answer](docs/question-types/short-answer.md)          | `[short-answer]: ...`             |
| [Numeric](docs/question-types/numeric.md)                    | `[numeric(unit)]: ...`            |
| [Fill in the blanks](docs/question-types/fill-in.md)         | `[^slug]` markers and definitions |
| [Essay](docs/question-types/essay.md)                        | `[essay]`                         |
| [Ordering](docs/question-types/ordering.md)                  | `[ordering]` and a list or code   |

Some examples:

```md
Which of these animals are native to the Pantanal?

* [x] Jaguar
* [x] Capybara
* [ ] Kangaroo
```

```md
Judge the statements about Brazilian biomes.

* [T] The Cerrado is a savanna.
* [F] The Pantanal is a desert.
```

```md
How tall is Pico da Neblina, the highest mountain in Brazil?

[numeric(m)]: 2995 +- 1%
```

```md
The Amazon River flows into the [^ocean] Ocean.

[^ocean/short-answer]: Atlantic
```

```md
Explain why the Caatinga has a short rainy season.

[essay]
```

Choices and patterns take student feedback in indented `>` lines and
instructor-only comments in `!` lines. Choice-based types accept a `grading`
strategy (`symmetric`, `partial` or `all-or-nothing`). See
[docs/responses.md](docs/responses.md) for how responses are represented and
scored.


## Exams

An exam is a file with an H1 title and several questions separated by `===`.
Questions can also be included by id from a question bank.

```md
---
locale: en
grading: partial
---

# [bio-01] Brazilian biomes

Answer all questions.

---
id: largest-biome
---

Which is the largest biome in Brazil?

* [*] Amazon
* [ ] Cerrado
* [ ] Caatinga

===

Explain why the Caatinga has a short rainy season.

[essay]
```

See [docs/exam.md](docs/exam.md) for inheritance of fields, includes, scoring,
scheduling (`start` and `duration`) and the other exam options.


## Tools

### mdq-py

The Python package is the reference implementation. It parses, validates and
lints documents, scores responses, and converts questions to and from GIFT,
Aiken and Moodle XML.

```bash
uv tool install "git+https://github.com/fabiommendes/mdq-py"

mdq new multiple-choice         # scaffold a question
mdq validate question.mdq.md    # check errors and lint warnings
mdq show exam.mdq.md            # show the parsed document in the terminal
mdq export question.mdq.md --format gift
```

See the [mdq-py README](mdq-py/README.md).

### mdq-js

The TypeScript package ports the parser and the schemas (as Zod validators) for
web applications.

```ts
import { parseQuestion } from "mdq";

const question = parseQuestion(source);
```

See the [mdq-js README](mdq-js/README.md).

### Agent skill

[skills/mdq-questions](skills/mdq-questions/SKILL.md) is an
[Agent Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
that teaches LLM agents to write valid MDQ documents.


## Repository layout

| Path                   | Contents                                                     |
| ---------------------- | ------------------------------------------------------------ |
| `docs/`                | Specification of each question type, exams and lint codes    |
| `schema/`              | JSON Schema (YAML) of parsed questions and exams             |
| `examples/valid/`      | Valid documents with their expected YAML and lint results    |
| `examples/invalid/`    | Documents that implementations must reject                   |
| `skills/`              | Agent skill to write MDQ                                     |
| `scripts/`             | Maintenance scripts, such as the schema bundler              |
| `GLOSSARY.md`          | Terms used in the specification                              |
| `mdq-py/`, `mdq-js/`   | Implementations (git subtrees of their own repositories)     |


## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: a change to the format goes
first to the specification (`docs/`, `schema/`, `examples/`), then to mdq-py,
and then it is ported to mdq-js. The test suites of both implementations read
the shared examples, so run them from a clone of this repository.

See also the [changelog](CHANGELOG.md), the [code of conduct](CODE_OF_CONDUCT.md)
and the [security policy](SECURITY.md).


## License

[MIT](LICENSE)
