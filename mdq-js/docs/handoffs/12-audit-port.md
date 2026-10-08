---
type: handoff
status: completed
tags: [mdq, mdq-js, parser, schema, audit]
relatedTo: [mdq-js/docs/sync/roadmap.md, dev/audit/plan.md]
---

# Cycle F4 — Port the spec audit

## Goal

Bring the Zod schemas and the parser up to mdq-spec `844dc01` and mdq-py
`a7f866a`, the end of the corpus audit (`dev/audit/plan.md`, local). The
corpus is the test: every `examples/valid/**/*.mdq.md` parses into its
`.yaml`, every `examples/valid/**/*.yaml` validates, every
`examples/invalid/**/*.{yaml,json}` outside `syntax/` is rejected, and every
`examples/invalid/*.mdq.md` is rejected with a code its `.lint.json` pins.

## What changed

* Schema: `QuestionGrading`/`QuestionShuffle` (`inherit`), exam `shuffle`,
  `correct` required in multiple-selection and true-false, a one-code-point
  true-false marker, `PATTERN_STRING_PATTERN`, `unmatched` and
  `incorrectFeedback`, no `oneOf`/`regex`/`openEnded`, a free `answerKey`,
  `Question` as a discriminated union.
* Frontmatter: the YAML 1.2 Core schema (`loadYaml`, `CORE_SCHEMA`), nulls
  dropped (`keepNull` for an exam `title`), `YamlSyntaxError`, CR line ends,
  the known-keys tables and `unknownFrontmatterWarnings`.
* Choices: the link rule in `SLUG_PREFIX_RE`/`CHOICE_ID_PREFIX_RE`, an empty
  `*` item, `foreignChoiceIndex`, the omitted `[ ]` score, `correct: false`.
* Question parser: `blockText` (ATX `#` kept), the raw-line ordering
  observations, `parseAnswerBlock` (accept/reject, detached list warning),
  `decimalPlaces`, the fill-in rewrite (`distributeBlankPatternLists`,
  adjacent choice list, `unmatched`), a second `## [answer-key]`, the
  epilogue-before-section rule, `comment: ""`, an unconverted `type`.
* Exam parser: `isExam` on the first non-blank line, `shuffle`, canonical
  `start`/`duration` (`schedule.ts`), `setext-heading` and
  `separator-before-include` warnings, a fence with broken YAML is a block.
* `parseDocument`, `Diagnostic`, `ParseError.code`/`path`.
* Tests: `tests/invalid-sources.spec.ts`, `LOAD_CODES`/`LOAD` in
  `not-ported.ts`, `INVALID_SYNTAX`/`RESOLVED_SUFFIX` in `corpus.ts`, and
  the unit suites rewritten to the audit rules (expected values checked
  against mdq-py by running every case through `parse_question`).

## Out of scope, next

`docs/sync/roadmap.md`, "Reference changes waiting for a phase": F4.1
(resolution, query, `.resolved.yaml`), F5 (model rules, `load`), F6 (lint,
`.lint.json`), F7 (scoring, `examples/grading/`).
