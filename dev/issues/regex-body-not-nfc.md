---
type: issue
status: todo
tags: [regex, unicode, spec]
relatedTo: [docs/regex.md, docs/responses.md]
---

# Regex body in NFD never matches without the `n` flag

A regex body written in NFD (decomposed) without the `n` flag never matches.
Responses are NFC and the body is not normalized. Example: `/café/` with `é` as
`e` + U+0301 never matches the response `café` (NFC).

The spec does not say it.

## Options

- Normalize the body to NFC always.
- Lint warning `regex-body-not-nfc`.
- Document it only.

No decision yet.
