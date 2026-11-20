# Upload

One or more files that the student sends, graded manually. The body is the
single tag `[upload]`.

```md
---
maxFiles: 2
maxSize: 5 MB
extensions: [".pdf", ".png", ".jpg"]
---

Draw the water cycle of the Sao Francisco river basin and send a photo or a PDF
of the drawing.

[upload]
```

## Frontmatter

| Field      | Values                                                            |
| ---------- | ----------------------------------------------------------------- |
| maxFiles   | Integer, at least 1. Default is 1                                  |
| maxSize    | Size of each file: bytes (`1048576`) or a string (`512 KB`, `5 MB`, `1.5GB`). Units `B`, `KB`, `MB`, `GB` in upper case, powers of 1024. No limit when omitted |
| extensions | List of extensions in lower case, each with a leading dot: `[".pdf", ".tar.gz"]`. Any file when omitted |

A file matches an extension when its name ends with it, ignoring `A-Z` against
`a-z`: `Report.PDF` matches `.pdf`. A name that is only the extension matches
nothing.

## Answer key

Optional, as in an [essay](essay.md#answer-key): an `## [answer-key]` section
after the `[upload]` tag and any epilogue. It guides the instructor. Never show
it to the student before the response is submitted.

```md
Draw the circuit and send a photo of it.

[upload]

## [answer-key]
The drawing shows the battery, the switch and the two lamps in series.
```

The tag paragraph holds only `[upload]`. `[upload]: x` (with a colon) is an
error. The instructor grades every response: there is no `grading` field.

The host stores the files. A response is a list of `{name, path, size}` items.
`null` skips the question.
