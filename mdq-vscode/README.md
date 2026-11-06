# MDQ for Visual Studio Code

Support for [MDQ](https://github.com/fabiommendes/mdq-spec), a format for
questions and exams written in Markdown, YAML or JSON.

## Features

- Errors and warnings in the editor and in the Problems panel, updated as you
  type. The extension uses the same validator as the `mdq` npm package.
- Completion and hover in YAML and JSON documents, from the MDQ JSON Schema.
- A preview of the question, as the student sees it and with its answer key.
  Run **MDQ: Open Preview to the Side** (`Ctrl+K V`), or use the button in
  the editor title. A response you give in the student view is graded in the
  answer key view; with no response, the answer key view shows a correct one.
  Exams are not previewed yet.

## Files

The extension reads files with a double extension:

| File         | Format   |
| ------------ | -------- |
| `*.mdq.md`   | Markdown |
| `*.mdq.yaml` | YAML     |
| `*.mdq.yml`  | YAML     |
| `*.mdq.json` | JSON     |

A `*.mdq.md` file stays a Markdown file: the editor keeps its highlight and
Markdown features.

YAML support uses the [YAML extension by Red Hat](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml),
which is installed with this extension.

## Settings

| Setting                | Default | Description                                                     |
| ---------------------- | ------- | --------------------------------------------------------------- |
| `mdq.diagnostics.info` | `hint`  | How to show `info` diagnostics: `information`, `hint` or `off`. |

The codes of the diagnostics are explained in
[lint-codes.md](https://github.com/fabiommendes/mdq-spec/blob/main/docs/lint-codes.md).
