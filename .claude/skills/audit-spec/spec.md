This audits the MDQ specification itself, not compliance of any implementation.

The specification can be flawed in many different ways, and the audit is
intended to identify such flaws and fix them. The categories below list the
flaws to look for.

## Before you start

Part of the audit is automated in a script that checks that the schemas, the
docs, the "Additional Rules" tables, `docs/lint-codes.md`, and the corpus
agree, and that `mdq-py` accepts the corpus against the schemas. It
regenerates the schema bundle first. Run it from the repository root:

```bash
uv run scripts/spec_audit.py
```

It must pass. When it fails, read the reported error, investigate the root
cause, and propose a fix. Continue if the human accepts the fixes; otherwise
stop.

Copy this checklist and track it:

```
- [ ] 1. Load audit-report
- [ ] 2. Read the specs
- [ ] 3. Verify the formal grammars
- [ ] 4. Scan each question type
- [ ] 5. Synthesize and render
```

## Categories

1. **Contradictions (`contradiction`):** conflicting statements or
   requirements that cannot be satisfied at the same time.
2. **Ambiguities (`ambiguity`):** vague, imprecise, or unclear statements that
   can be read in more than one way.
3. **Omissions (`omission`):** aspects or scenarios the specification should
   cover and does not, including rules and edge cases that no example in the
   corpus exercises.
4. **Inconsistencies (`inconsistency`):** inconsistent terminology,
   conventions, formatting, or document structure, in the specification
   documents or in the `.mdq` files. Includes similar properties named
   differently across question types, and different properties sharing a name.
5. **Grammar violations (`grammar`):** a grammar in
   `docs/references/grammar.md` that accepts input its stated rules forbid, or
   rejects input they allow.
6. **Schema mismatches (`schema`):** a question type's document and its JSON
   schema in `schema/<type>.yaml` disagree.

## Severity

| Level      | Meaning                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `critical` | Severely impacts the correctness or usability of the spec; introduces contradictions in practical use.             |
| `high`     | Ambiguous interpretations, or issues that introduce contradictions in contrived scenarios.                         |
| `medium`   | Convention violations, minor inconsistencies, and issues that moderately affect the spec without major disruption. |
| `low`      | Minimal impact: pedantry, superficial concerns, minor text improvements.                                           |
| `info`     | Informational notes or suggestions for improvement.                                                                |

## Editing the specs during the audit

Fix spelling and grammar mistakes as you read; they are not findings. Keep
every line on its line number, even if it means Markdown lines wrap at the
wrong places: findings cite `path:line`. After each round of fixes, run
`audit-findings -a spec check`, and `update` every finding whose location or
snippet it reports as broken.

## 1. Load audit-report

Invoke the `audit-report` skill now and start or resume the log. The area is
`spec`; the issue title prefix is `[Spec]`. Set `scope` to the whole
specification or to the question types the user named.

## 2. Read the specs

Specs are at `docs/`. Always read:

- `docs/references/grammar.md`
- `docs/references/patterns.md`
- `docs/question-types/question-base.md`
- `docs/exam.md`
- `docs/responses.md`

If the user named question types, also read `docs/question-types/<type>.md`
for each; otherwise read every file in `docs/question-types/`.

Record each flaw as a finding in its category, with `location` as
`docs/<file>.md:<line>` and the offending text in `snippet`.

## 3. Verify the formal grammars

Spawn one subagent for the `grammar` category, briefed as `audit-report`
describes in "Splitting the audit across agents", with the Severity table
above. Instruct it to:

1. Read `docs/references/grammar.md`.
2. Turn each grammar into a Lark grammar and test it against the rules the
   document states. The audit script already checks that every snippet
   compiles, with stubs for the undefined rules; the subagent must still test
   what the grammars accept and reject. Fill the unspecified rules with stub
   rules to make them testable.
3. Be meticulous: for each violation, record a finding that quotes the
   grammar rule in `snippet` and gives the counter-example in `description`.
   Record a strength for each grammar that holds, with the inputs tested.

## 4. Scan each question type

For each question type in scope, spawn a fresh subagent, briefed as
`audit-report` describes in "Splitting the audit across agents", with the
Severity table above and the "Editing the specs during the audit" section. Run
one subagent at a time, since they edit the specs. Give it the question type
instead of a set of categories, and tell it not to run `start` or `done`. Do
not pass on what you found in step 2: its review must be independent.
Instruct it to:

1. Read `docs/question-types/<type>.md` and the other specs needed to
   understand the question type.
2. Fix spelling and grammar mistakes, as "Editing the specs during the audit"
   describes.
3. Record contradictions, ambiguities, omissions, and inconsistencies in the
   question type's specification.
4. Read `schema/<type>.yaml` and record as `schema` every mismatch with the
   specification: properties declared in one but not the other, type or
   format mismatches, and descriptions that disagree. `scripts/spec_audit.py`
   already checks property presence and types between the frontmatter table
   and the schema, so focus on formats, constraints and descriptions.

5. Test with the reference implementation each ```md block that the spec
   presents as a complete valid document. Skip fragments and counterexamples.
   Pipe the block to `mdq validate`, from the repository root:

   ```bash
   uv run --directory mdq-py mdq validate - <<'EOF'
   <block>
   EOF
   ```

   Record a finding when it rejects the document, or reports a warning that
   the text does not expect. Use `--format yaml` or `--format json` for a
   `yaml` or `json` block.

After each subagent finishes, review its findings as `audit-report` describes
in "Reviewing subagent findings". When you disagree with a finding and
rereading the spec does not settle it, keep it and write both readings, with
the rationale for each, in `description`.

## 5. Synthesize and render

Mark all six categories `done`. With every category, finding, and strength
recorded as `audit-report` defines, write the synthesis and render the report.

- Look for patterns across findings. Group findings that share one fix into
  one issue, such as the same property named differently in several question
  types.
- Point each recommendation in a direction that makes the whole
  specification more coherent and usable.
- Each issue is a decision for the human. When more than one fix is
  reasonable, list the options in `summary` and recommend one.
