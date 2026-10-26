This is the decision committee. Use it when an audit leaves more than five
decisions for the human. With five or fewer, present them to the human as
usual, at most four at a time.

The committee has three members: you (the lead) and two persistent Opus
agents with opposite profiles. The human sees only the decisions without
consensus. Most audit decisions have one clearly better option, and the human
only validates them.

## Members

- **CommonMark:** consistency with CommonMark, predictable rules, no ambiguity
  and no exceptions, even if the code cost is high.
- **Simplista:** a simple spec and a simple implementation, minimal new code.
  Asks for strong evidence before a change that adds complexity or touches
  code that works.
- **Lead (you):** votes with the same weight. Also checks the votes against
  the repository conventions (see "Known risks").

Spawn each member once and continue it with `SendMessage` across batches, so
it keeps the context of the earlier decisions.

## Workspace

Use `/tmp/committee/`:

| Path                 | Content                                                         |
| -------------------- | --------------------------------------------------------------- |
| `README.md`          | Format of a decision file, plus the decisions already taken     |
| `Dxx-<slug>.md`      | One decision point (or a group of related points `Dxx.1`, ...) |
| `ex/*.mdq.md`        | Example documents that the decision files cite                  |
| `votes/<member>.md`  | Votes of each member, one section per round                     |
| `FINAL-<batch>.md`   | Final decisions and implementation notes for the implementers  |

## Steps

1. **Write the decision files.** A neutral writer (you or a subagent) writes
   one file per decision. The file has:
   1. Title and finding ids.
   2. Problem: what the spec says today (`path:line`), and why it is a
      problem.
   3. Examples: concrete MDQ snippets with the current behavior of mdq-py,
      verified with `uv run --directory mdq-py mdq validate` or `mdq show`.
   4. Affected repository conventions: lint code conventions,
      `mdq-py/tests/test_lint_codes_consistency.py`, `scripts/spec_audit.py`
      checks, `examples/model-only/`, importers in `mdq-py/mdq/convert/`.
   5. Real usage: search the corpus, the tests and `mdq-py/mdq/convert/` for
      the syntax the decision affects. Report what you found. Never write
      "probably no document uses it" without this search.
   6. Options (a), (b), ...: what changes in docs, schema, mdq-py, corpus and
      the mdq-js port, and the consequences.
   7. No recommendation.

   List in `README.md` the decisions already taken, so the members do not
   reopen them.
2. **Lead votes first.** Write your votes in `votes/lead.md` before you read
   the votes of the other members.
3. **Round 1.** Send the members batches of decision files (three to ten
   decisions per batch). Each member writes to `votes/<member>.md` and does
   not read the other votes. Tell them to check their premises by running
   code (`mdq validate`, the tests, grep) and not by memory. A vote is one
   option plus the caveats that the implementation must respect.
4. **Round 2.** For every decision without unanimity, show all the votes to
   each member. Each one defends its vote or changes it, in a new section of
   its file.
5. **Result.**
   - Unanimous: apply it. Report it to the human in one line.
   - No consensus after round 2: ask the human, with the alternatives and
     the arguments of each member. A tie on a trivial point (a text detail,
     an easy revert) is settled by the lead if the human agreed to that
     before; otherwise ask.
6. **Write the FINAL files.** For each batch, write `FINAL-<batch>.md` with
   the final understanding of each decision and the implementation notes:
   files to change, corpus examples to add, lint codes, and the caveats from
   the votes. Before you write it, check every caveat against the repository
   conventions. The committee can agree on something the repository forbids.
7. **Implement.** Subagents implement each FINAL file, never you. Split the
   work in packages by file, so that two implementers never edit the same
   file. Files that every package touches (the changelogs, a shared
   question type doc) go to one package or to the cleanup step. Tell each
   implementer to:
   - read a file again just before it edits it;
   - never run `git rm`, `git stash`, `git checkout`, `git reset`, `pkill` or
     `kill`;
   - not commit.
8. **Cleanup.** After all packages finish, run the complete check once:
   `uv run scripts/spec_audit.py`, and in `mdq-py/`: `uv run pytest -q`,
   `uv run mypy mdq`, `uv run ruff check`. Failures between packages are
   expected here; fix them in this step. Add the mdq-js port notes to the
   handoff.
9. **Commit, only if the human asks.** Check `git diff --cached --stat`
   first: `git commit` takes everything in the index, including files that
   an implementer staged. Keep one commit per subtree and one for `dev/`.

## Experience from the first use (full spec audit, 2026-10-26)

Pros:

- The human saw 3 of 35 decisions. The other 32 had consensus.
- The opposite profiles found real errors. Examples: the Cebraspe `[E]`
  marker gave a wrong score; the argument that the regex `.` must follow the
  JavaScript set, because the dialect is a subset of JavaScript.
- Round 2 settled 7 of 10 divergences.
- The written votes are auditable after the fact.
- Parallel implementers, one per package, were fast.

Cons and known risks:

- Votes can start from wrong premises about repository conventions. The
  committee chose "no new code, use `schema-error`" for rules that only the
  model checks, but `mdq-py/tests/test_lint_codes_consistency.py` and step 6
  of `scripts/spec_audit.py` keep `schema-error` for what the schema
  expresses. The lead had to add new codes (`empty-ordering-line`,
  `block-start-pattern`).
- Consequences appear after the vote. D15 (a pattern that starts a block is
  invalid) broke the lone `*` pattern and the GIFT/Moodle importer, which
  writes `*`. The decision file said "probably no document uses it" without
  a search.
- A 2 to 1 vote on a trivial point (whitespace of a frontmatter comment)
  still went to the human.
- Context cost: the lead reads every decision file to vote.
- Concurrent implementers caused failures across packages, concurrent edits
  of the same doc and of the changelogs, and one accidental `git rm` and
  `pkill`.
- The first commit took files that were in the index from an earlier step.

The steps above already include the fixes for these risks: the
"affected conventions" and "real usage" sections of the decision file, the
premise check by running code, the tie rule for trivial points, packages by
file, the implementer restrictions, the cleanup step and the index check.
