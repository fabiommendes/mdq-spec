# mdq-js

[![CI](https://github.com/fabiommendes/mdq-spec/actions/workflows/ci.yml/badge.svg)](https://github.com/fabiommendes/mdq-spec/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [!WARNING]
> This is a work in progress. The MDQ specification is not stable yet, and this
> port does not implement every feature of the Python reference implementation.

TypeScript implementation of [MDQ](https://github.com/fabiommendes/mdq-spec), a
file format to write questions and exams in plain Markdown:

```md
What is the capital of Brazil?

* [ ] Rio de Janeiro
  > It was the capital until 1960.
* [*] Brasília
* [ ] São Paulo
```

`mdq-js` provides:

* A parser from MDQ Markdown to plain objects.
* [Zod](https://zod.dev) schemas that validate parsed questions and exams.
* Types for student responses.

The syntax of each question type is in the
[specification](https://github.com/fabiommendes/mdq-spec/tree/main/docs).

This package is a port of [mdq-py](https://github.com/fabiommendes/mdq-py),
which is the reference for correct behavior. It is not a line-by-line
translation: documents are plain objects validated by Zod, not model classes.

Status compared to mdq-py:

| Feature                         | Status    |
| ------------------------------- | --------- |
| Question parser                 | Available |
| Question and exam validation    | Available |
| Exam parser                     | Planned   |
| Linter                          | Planned   |
| Scoring                         | Planned   |
| SolidJS components              | Planned   |
| CLI                             | Not planned, use mdq-py |


## Installation

The package is not on npm yet. Install it from the repository:

```bash
pnpm add github:fabiommendes/mdq-js
```

`solid-js` is an optional peer dependency, reserved for the planned components.


## Usage

`parseQuestion()` parses and validates a question. It throws `ParseError` if the
source is not a valid MDQ question:

```ts
import { parseQuestion } from "mdq";

const question = parseQuestion(`
What is the capital of Brazil?

* [ ] Rio de Janeiro
* [*] Brasília
`);

console.log(question.type); // "multiple-choice"
console.log(question.choices);
// [
//   { id: "rio-de-janeiro", text: "Rio de Janeiro", score: 0 },
//   { id: "brasilia", text: "Brasília", score: 1 },
// ]
```

To validate separately, parse into an unvalidated object and pass it to a
validator. Validators return a result instead of throwing:

```ts
import { parseQuestionDocument, validateDocument } from "mdq";

const raw = parseQuestionDocument(source);
const result = validateDocument(raw);
if (result.success) {
	console.log(result.data);
} else {
	console.error(result.error.issues);
}
```

Other exports:

* `validateQuestion()` and `validateExam()` validate one kind of document.
* `isExam(source)` checks if a source is an exam (it has an H1 title).
* The Zod schemas (`Question`, `Exam`, one per question type) and the
  TypeScript types inferred from them.
* Response types, such as `MultipleChoiceResponse` and `ExamResponses`.


## Development

The test suite reads the schema and the shared examples from the parent
[mdq-spec](https://github.com/fabiommendes/mdq-spec) repository, where this
package lives in the `mdq-js/` directory. Clone that repository to run the
tests; a standalone clone of `mdq-js` cannot run them.

```bash
git clone https://github.com/fabiommendes/mdq-spec
cd mdq-spec/mdq-js
pnpm install
pnpm test        # Vitest
pnpm typecheck
pnpm lint        # Biome
pnpm docs        # API docs with TypeDoc
```

New features are implemented in mdq-py first and then ported here.
[docs/sync](docs/sync/README.md) describes how the Python modules and types map
to TypeScript.

See the [changelog](CHANGELOG.md) and the
[contributing guide](https://github.com/fabiommendes/mdq-spec/blob/main/CONTRIBUTING.md).


## License

[MIT](LICENSE)
