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
  tests (`documents.ts`, `ranges.ts`, `webview/grade.ts`). `extension.ts`
  and `preview.ts` only wire it to the editor API.
- `src/webview/` is the preview page, bundled for the browser with the Solid
  components of mdq-js. It loads the document itself; the extension only
  sends the text (`webview/protocol.ts`). `build.mjs` makes every import of
  `solid-js` resolve from this package: two copies break reactivity. Do not
  add `solid-js` to the `paths` of `tsconfig.json`: esbuild reads them and
  then picks the server build of `solid-js/web`.
- Public strings, comments and docs in English.
