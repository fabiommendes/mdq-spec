# mdq playground

A small app to see, design and test the `mdq/solid` components. It is not
part of the npm package: `package.json` of `mdq-js` publishes only `dist/` and
`css/`.

```bash
cd mdq-js/playground
pnpm install
pnpm dev       # http://localhost:5180
pnpm e2e       # Playwright, starts the dev server itself
```

- The app reads the components from `../src/`, so an edit shows at once.
- The sidebar lists every valid question of `examples/valid/` and the local
  questions of `fixtures/`. Each page shows the source, which you can edit,
  and the question in the `answer`, `readonly` and `review` modes. The
  response you give in `answer` is the one `readonly` and `review` show.
- `stories/` holds user stories in Markdown. Each story lists the e2e tests
  that check it, and each test refers back to its story.
- `e2e/` holds the Playwright tests. They use the system Chromium
  (`/usr/bin/chromium`, or the path in `CHROMIUM`) when it exists, else the
  Chromium of Playwright (`pnpm exec playwright install chromium`).
