---
type: note
status: complete
tags: [mdq-js, temporal, exam, start, duration, yaml, research]
relatedTo:
  - mdq-js/docs/handoffs/09-parser-exam.md
  - mdq-js/src/schedule.ts
  - mdq-js/src/parser/frontmatter.ts
  - mdq-py/mdq/_schedule.py
  - docs/exam.md
---

# Temporal API for exam `start` and `duration`

Question: use TC39 Temporal instead of the `YamlTimestamp` class and the string
functions `canonicalStart` / `canonicalDuration` (F4.1, decision D4)?

Checked on 2026-09-29. Local experiments used `temporal-polyfill@1.0.5` and
`@js-temporal/polyfill@0.5.1` under Node 22.23.3, and PyYAML/CPython.

## Verdict

- Not now. Keep the `YamlTimestamp` design, string in and string out.
- Temporal cannot be the source of truth: no Temporal type holds "date-time
  with a fixed UTC offset, without a zone" natively, and the parse functions
  drop offset or time silently.
- Revisit when the Node floor is 26 or later and Safari ships. Keep an internal
  seam so this is a local change (see section 5).

## 1. Temporal status

- TC39: Stage 4 (March 2026), part of ES2026. The proposal repo says it
  "reached Stage 4" and lists shipped engines.
  Source: https://github.com/tc39/proposal-temporal
- Firefox 139 (2025-05-27), Chrome/Edge 144 (2026-01-13), Node.js 26
  (2026-05-05). Source: same repo README.
- Node 26 release notes: "The Temporal API is now enabled by default in
  Node.js 26". Source: https://nodejs.org/en/blog/release/v26.0.0
- Node 26 becomes LTS on 2026-10-28
  (https://github.com/nodejs/Release/blob/main/schedule.json). Node 22 (maintenance
  until 2027-04-30) and Node 24 have no unflagged Temporal. Verified:
  `typeof Temporal` is `undefined` on Node 22.23.3.
- Safari: not supported in release versions (Technology Preview only), per
  https://caniuse.com/temporal. MDN still marks it "Limited availability, not
  Baseline": https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_objects/Temporal
- mdq-js target today: CI uses Node 22 (`.github/workflows/ci.yml`,
  `node-version: 22`). No `engines` field in `mdq-js/package.json`. tsconfig
  `target: ES2022`, `lib: ["ES2022", "DOM"]`. Installed TypeScript 5.9.3.
- TypeScript types: `lib.esnext.temporal.d.ts` exists in TypeScript 6.0.x
  (HTTP 200 on the unpkg file for 6.0.3). Not in 5.9. Using it means
  `lib: ["ESNext.Temporal"]` and a TS upgrade. Polyfills ship own types.

Consequence: native Temporal is unusable in CI and for library consumers on
Node 22/24 and Safari. A polyfill would be a hard runtime dependency.

## 2. Polyfills

| Package | Version | Date | Notes |
| --- | --- | --- | --- |
| `temporal-polyfill` (FullCalendar) | 1.0.5 | 2026-09-11 | ~19.9 kB gzip, 58.9 kB min (bundlephobia). Deps: `temporal-spec`, `temporal-utils`. Tests against test262. Tree-shakeable function API. Actively released. |
| `@js-temporal/polyfill` (champions) | 0.5.1 | 2025-03-31 | Unpacked 3 MB, dep `jsbi`. Proposal README lists it as "alpha". No release since March 2025. |
| `temporal-polyfill-lite` | 0.4.3 | 2026-09-02 | Release candidate per proposal README. Unpacked 330 kB. Not evaluated further. |

- Neither main polyfill installs a global by default; import explicitly.
- Fidelity: both gave identical results in every experiment below.
- Sources: npm registry metadata, https://github.com/fullcalendar/temporal-polyfill,
  https://github.com/js-temporal/temporal-polyfill.

## 3. Fit

Reference: PyYAML plus `isoformat()` (`mdq-py/mdq/_schedule.py`).

### 3.1 `start`

PyYAML results (measured):

| YAML value | Python type | `isoformat()` |
| --- | --- | --- |
| `2026-03-10` | date | `2026-03-10` |
| `2026-03-10 09:00:00` | datetime | `2026-03-10T09:00:00` |
| `2026-03-10T09:00:00Z` | aware datetime | `2026-03-10T09:00:00+00:00` |
| `2026-03-10T09:00:00-03:00` | aware datetime | `2026-03-10T09:00:00-03:00` |
| `2026-03-10T09:00:00.5+05:30` | aware datetime | `2026-03-10T09:00:00.500000+05:30` |
| `2026-03-10T09:00:00.1234567` | datetime | `2026-03-10T09:00:00.123456` (truncated) |
| `2026-03-10T09:00` | str (YAML 1.1 needs seconds) | parsed later by `fromisoformat` to `...T09:00:00` |

Temporal mapping (measured, both polyfills):

- Date: `PlainDate` fits. But `PlainDate.from("2026-03-10T09:00:00")` succeeds
  and drops the time. It cannot be used to classify date vs date-time.
- Naive date-time: `PlainDateTime` fits. Prints `2026-03-10T09:00:00`. Same
  as Python.
- Offset date-time: no direct type.
  - `PlainDateTime.from("...-03:00")` silently drops the offset.
    Data loss, no error.
  - `Instant.from` keeps the moment but normalizes to `2026-03-10T12:00:00Z`.
    Offset lost.
  - `ZonedDateTime.from` needs a bracketed zone. It works with an offset zone:
    `ZonedDateTime.from("2026-03-10T09:00:00-03:00[-03:00]")` then
    `toString({timeZoneName: "never"})` gives `2026-03-10T09:00:00-03:00`.
    This needs the source string rewritten first, so a separate parser is
    needed anyway. `Z` needs `[UTC]` or `[+00:00]` and prints `+00:00`. OK.
- Fractional seconds differ:
  - Python prints 6 digits when microseconds are non-zero (`.500000`), and
    nothing when zero. Temporal prints minimal digits (`.5`). Exact output
    needs `fractionalSecondDigits: 6` only when the sub-second part is non-zero.
    Extra logic.
  - Python truncates to microseconds. Temporal keeps nanoseconds
    (`.123456789`). Needs explicit truncation.
- Input grammar differs. Python 3.13 `fromisoformat` accepts basic format
  (`20260310T090000`), `HH:MM` without seconds, and others.
  Temporal accepts `T09:00`, but not identical sets. The port already
  documents Python 3.13 grammar as the target. Temporal would change the
  accepted set and error text.
- Error messages: Python-exact messages (`invalid start date/time: '...'`) are
  already required by the stubs. Temporal `RangeError`s would be wrapped anyway.

Verdict: Temporal can represent all values, but only through 3 types plus
string rewriting plus post-format fixes. That is more code than the regex
approach.

### 3.2 `duration`

- `Temporal.Duration.from` reads ISO 8601: `P1W`, `P1DT2H30M`, `PT90M`,
  `PT1.5S` parse. Measured: `P1W` prints `P1W`; `PT90M` prints `PT90M`.
  Canonical form needs `round({largestUnit: "day"})`. Measured results:
  `PT90M` -> `PT1H30M`, `PT24H` -> `P1D`, `P1W2D` -> `P9D`. Matches
  `format_duration`.
- Does not cover `HH:MM` or `Xd Yh Zm`. Those need own regexes anyway.
- Too permissive: accepts `P1Y`, months, negative sign, lowercase, comma
  decimals, mixed signs. Each needs a pre-check. The mdq grammar is strict
  (`docs/exam.md` Lark snippet), so a regex is needed regardless.
- Nanosecond precision (`PT0.1234567S` is kept). Python truncates to
  microseconds.
- Rounding days with hours may require `relativeTo` for calendar units. With
  only weeks and days it worked, but the API contract is subtle.

Verdict: Temporal helps only with the final balancing, a few lines of integer
division. Not worth a dependency.

### 3.3 Where outputs would differ from Python

- Fractional digits (minimal vs 6 digits) and precision (ns vs us).
- Silent offset loss in `PlainDateTime.from`; silent time loss in
  `PlainDate.from`.
- Accepted input grammar and error messages.
- Duration: accepts years, months, sign.

## 4. Impact

### Public API

- Exposing Temporal types in the public API would force a polyfill on every
  consumer on Node 22/24 and Safari, and TS 6 or a polyfill's types.
- The schema stores strings (`schema/exam.yaml`: `start`, `duration` are
  `type: string` with a pattern). The parsed document is JSON-like data.
  Temporal objects are not JSON-serializable without `toString`. So the parsed
  document keeps strings regardless. Temporal would only be an internal step.
- Optional later: helper `examStartTemporal(doc)` for consumers on Node 26+.
  Out of scope now.

### Bundle size (SolidJS components)

- Polyfill adds ~20 kB gzip (`temporal-polyfill`), much more for
  `@js-temporal/polyfill` (3 MB unpacked, jsbi). The parser is otherwise
  js-yaml, markdown-it, zod, unidecode. A pure-string
  implementation adds under 1 kB.
- Native Temporal costs 0 bytes, but only where available (see section 1).

### YAML integration

- js-yaml `timestamp` type returns a JS `Date`
  (`node_modules/js-yaml/lib/type/timestamp.js`). Temporal does not change
  this. That constructor:
  - truncates the fraction to 3 digits (milliseconds), so microseconds are lost
    before any Temporal code runs;
  - converts an offset into an absolute instant, so the original offset is
    lost;
  - makes a date and a midnight UTC date-time indistinguishable.
- So a custom timestamp type is required with or without Temporal. It must
  keep the source text: override the `timestamp` type with a `Type` whose
  `construct` returns a value carrying the raw scalar (this is what
  `YamlTimestamp` and `loadExamFrontmatterYaml` already plan), and let
  `canonicalStart` normalize that text. Its resolve regex is close to
  PyYAML's (`Z`/offset, space separator, 1-digit month/day allowed).
- Temporal as the carrier instead of `YamlTimestamp` still needs the raw text
  to choose PlainDate / PlainDateTime / ZonedDateTime, so it adds nothing.

## 5. Recommendation

- R1: Keep `YamlTimestamp` plus string-in/string-out functions. No Temporal
  dependency in the F4.1 milestone.
- R2: Do not use `PlainDateTime.from` or `PlainDate.from` for validation. They
  drop data silently.
- R3: Keep D4 (one function per field, `RangeError` with the Python message).
  It already hides the representation. Structure the file so the pure
  parts are internal:
  - `parseStart(text): {kind: "date" | "datetime", ...fields, offset?}` and
    `formatStart(parsed): string`.
  - `parseDuration(text): {days, hours, minutes, seconds, micros}` and
    `formatDuration(parsed): string`.
  - Exported `canonicalStart` / `canonicalDuration` compose them. Swapping in
    Temporal later touches only these internals.
- R4: Match Python by regex plus integer arithmetic. Truncate fractions to 6
  digits, print 6 digits only when non-zero, offset as `+HH:MM`, `Z` as
  `+00:00`. Reuse the shared examples in `examples/` as the oracle.
- R5: Revisit "Temporal later" when all hold: Node 26 is the CI floor
  (LTS from 2026-10-28), Safari ships, and the repo uses TS 6+ with
  `lib.esnext.temporal`. Even then the win is small (balancing durations and
  validating calendar dates); the offset/fraction/grammar gaps in section 3
  remain.
- R6: Add tests for the Temporal traps only if Temporal is adopted:
  offset date-time round trip, `.5` vs `.500000`, ns truncation, `P1Y`
  rejection.
