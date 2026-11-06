# mdq-vscode

VS Code extension for MDQ. Read the root `AGENTS.md` first. Design:
`dev/rfc/extensao-vs-code-para-mdq.md` at the root.

The extension is a thin layer over mdq-js: it reads mdq-js from its sources in
`../mdq-js/src` (an alias in `build.mjs`, `tsconfig.json` and
`vitest.config.ts`), so it always builds against the working tree. A format
rule never goes here: it goes to the spec, mdq-py and mdq-js first.

Commands, from `mdq-vscode/`: `pnpm build` (bundles into `dist/` and copies
the schema bundle of the root), `pnpm test`, `pnpm typecheck`, `pnpm lint`,
`pnpm package` (a `.vsix`). `../mdq-js` needs its own `pnpm install`.

Rules:

- Code that does not need `vscode` lives in its own module and has vitest
  tests (`documents.ts`, `ranges.ts`). `extension.ts` only wires it to the
  editor API.
- Public strings, comments and docs in English.
