---
type: issue
status: todo
tags: [spec, mdq-py, parser, exam, convert]
relatedTo: [docs/references/grammar.md, docs/question-types/question-base.md, docs/exam.md, mdq-py/mdq/convert/_gift.py, mdq-py/mdq/convert/_moodle_xml.py]
---

# Spec questions from the mdq-py architecture review

The review found three cases where the code follows the literal spec (or the
spec disagrees with itself), but the result looks wrong. Each needs a spec
decision before any code change.

## Q1. A tag on a lazy continuation line disappears (parser S1)

```md
Q?

[short-answer]: x
[short-answer/reject]: y
```

- Actual: `accept: ['x [short-answer/reject]: y']`, no `reject`, no error.
  Fill-in `[^a/short-answer]: x` then `[^b/short-answer]: y` does the same:
  blank `b` is never defined. The numeric form fails with the confusing
  "malformed numeric body: '1 [^b/numeric]: 2'".
- The grammar agrees with the code: `LAZY_START`
  (`docs/references/grammar.md:183`) does not exclude `[`. But a valid tag
  that turns into pattern text silently goes against the intent of
  `detached-tag` (`docs/question-types/question-base.md`, "Tags after the
  epilogue starts").
- Options:
  - (a) Keep it. The grammar is literal; at most add a lint warning.
  - (b) A line that starts with a known tag is a `parse-error` inside
    content.
  - (c) A line that starts with a known tag ends the content and starts a
    new tag. Breaks CommonMark lazy continuation for that one case.
- Review recommends (b).

## Q2. Setext H1 in exam instructions (models B3)

```md
# Prova

Leia com calma
=====
```

- `docs/exam.md:125-131` ("Body"): instructions allow any block "except H1
  headings". A setext H1 is an H1.
- `docs/exam.md:168-181`: a setext heading in the instructions SHOULD warn
  (`setext-heading`), and the Additional Rules table (:512) lists only that
  warning.
- Actual: `setext-heading` warning only. `_has_atx_h1`
  (`mdq-py/mdq/models/_exam.py:92`) rejects only an ATX H1.
- Options:
  - (a) A setext H1 is `forbidden-block-element` (error), as the "Body" MUST
    says; `setext-heading` stays for setext H2.
  - (b) Keep the warning only, and reword "Body" to "except ATX H1 headings".
- Changes external behavior under (a).

## Q3. HTML text imported as Markdown (convert B7)

- GIFT `::q:: [html]<p>Capital?</p> {=Brasilia ~Rio}` imports with stem
  `<p>Capital?</p>`. Moodle XML `format="html"` is read and ignored the same
  way.
- When the `format` attribute is absent, the Moodle parser defaults to
  `markdown` (`mdq-py/mdq/convert/_moodle_xml.py:671`). Moodle's own importer
  defaults to `html`.
- MDQ is CommonMark, so raw HTML passes through, but block HTML in a stem is
  not what the author of the Moodle question meant (entities, `<br>`,
  `<p>`).
- Options:
  - (a) Convert HTML to Markdown on import (new dependency, lossy for complex
    HTML).
  - (b) Reject HTML text on import (`ValueError`), accept only `markdown`,
    `plain` and `moodle`.
  - (c) Keep the text as is, and document that HTML is copied verbatim.
- In every option, fix the Moodle default to `html` to match Moodle.
- Changes external behavior under (a) and (b), and for the default.

Regression test for Q1 and Q2, once decided: add a corpus example under
examples/ rather than a new test function.
