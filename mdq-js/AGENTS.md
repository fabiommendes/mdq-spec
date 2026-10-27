# mdq-js

TypeScript port of the MDQ parser. Read the root `AGENTS.md` first.

The conventions of this package live in `docs/sync/`:

- `docs/sync/README.md`: how the port relates to mdq-py (the reference).
- `docs/sync/modules.md`: the Python -> TypeScript map of modules and API.
- `docs/sync/schemas.md`: how Zod schemas mirror `schema/*.yaml`.
- `docs/sync/testing.md`: the shared corpus, `tests/corpus.ts`,
  `tests/not-ported.ts`.
- `docs/sync/roadmap.md`: decisions and the history of the phases.

Commands, from `mdq-js/`: `pnpm test`, `pnpm typecheck`, `pnpm lint`
(`biome check`; `--write` only on hand-written files, never on
`src/mdq.schema.json` or `src/inexact-tables.json`).

Rules:

- Python decides. When a TypeScript expectation and mdq-py disagree, run the
  case in mdq-py and fix the TypeScript side.
- Idiomatic TypeScript, not a transliteration: plain objects and functions,
  no model classes. Keep the module layout parallel to mdq-py
  (`docs/sync/modules.md`) so a reader can find the reference file.
- A fact about the format is a corpus example, not a unit test. A unit test
  that breaks because the format changed moves to the corpus or is deleted.
- Every corpus example runs. A feature that is not ported yet is listed in
  `tests/not-ported.ts`, never skipped.
- Public strings, comments and docs in English.
