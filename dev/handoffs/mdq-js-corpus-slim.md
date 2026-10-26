---
type: handoff
status: open
tags: [mdq-js, corpus, port]
relatedTo: [mdq-py-test-suite-slim, mdq-js-port-pendente]
---

# Exemplos novos do corpus que a mdq-js reprova

O enxugamento da suíte da mdq-py (`dev/refactor/mdq-py-test-suite-slim.md`)
levou casos de testes unitários para `examples/`. A mdq-py passa em todos. A
mdq-js passou de 292 para 353 falhas; as 61 novas estão abaixo. Cada uma é uma
divergência do port ou uma regra ainda não portada.

- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > essay-snake-case-frontmatter-key.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > exam-tags-string-empty-entry.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > exam-unknown-frontmatter-key.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > fill-in-decimal-places-on-short-answer-blank.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > fill-in-detached-choice-and-numeric.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > fill-in-incorrect-feedback-undefined-blank.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > fill-in-marker-line-after-blank-definition-content.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > multiple-selection-comment-between-feedback-blocks.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > multiple-selection-feedback-between-comment-blocks.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > multiple-selection-first-item-is-an-inline-link.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > multiple-selection-first-item-is-a-reference-link.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > multiple-selection-two-comment-blocks.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > ordering-text-accept-jump.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > ordering-text-reject-starts-nested.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-bang-line-after-reject-content.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-empty-tag-then-accept-block.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-frontmatter-one-of.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-frontmatter-regex.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-frontmatter-reject.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-item-two-feedback-blocks.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-marker-line-after-continuation.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-open-ended-frontmatter.mdq.md
- tests/invalid-sources.spec.ts > invalid sources are rejected with the codes their .lint.json pins > short-answer-quote-line-after-content.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.stem-indented-code-block-of-nbsp.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.thematic-break-four-dashes.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.thematic-break-indented-dashes.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.thematic-break-spaced-asterisks.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.thematic-break-spaced-dashes.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > essay.thematic-break-underscores.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > exam.separator-then-frontmatter-after-thematic-break.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > exam.thematic-break-colon-line.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > exam.thematic-break-then-bare-frontmatter.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > fill-in.numeric-blank-maps-places.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > fill-in.open-blank-between-definitions.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > multiple-selection.choice-comment-empty-marker-line.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > multiple-selection.choice-deep-indent-continues-feedback.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > multiple-selection.choice-deep-indent-continues-text.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > multiple-selection.choice-feedback-image-line.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > numeric.exponent-both-tolerances.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > numeric.exponent-relative-tolerance.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > numeric.exponent-smallest-double.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > numeric.exponent-trailing-zero-places.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > numeric.h1-line-in-stem-code-block.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.accept-blank-line-skip-blanks.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.accept-uses-key-copies.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.reject-differs-only-by-level-strict.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.reject-uses-distractor.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.section-empty-feedback-marker-line.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > ordering.tag-space-before-colon.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.accept-tag-without-pattern.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.bare-accept-with-reject.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.bare-tag-detached-list-epilogue.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.exact-literal-spans-lines-block.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.indented-marker-continuation.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.indented-underline-continuation.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.pattern-empty-feedback-marker-line.mdq.md
- tests/parser.spec.ts > corpus: parseQuestionDocument matches the paired fixture > short-answer.stem-with-prose-list.mdq.md
- tests/schema.spec.ts > model-only invalid examples > model-only.essay-h1-in-yaml-stem.yaml
- tests/schema.spec.ts > model-only invalid examples > model-only.short-answer-blank-pattern-forms.yaml
- tests/schema.spec.ts > validateDocument routes each valid example to its schema > numeric.exponent-trailing-zero-places.yaml
- tests/schema.spec.ts > valid examples > numeric.exponent-trailing-zero-places.yaml
