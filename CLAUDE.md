# MDQ

Mdq is a file format that declare questions and exams using markdown. It
documents the syntax and expected transformation for a JSON/YAML representation.
The transformed format can be validated against the JSON schema in `schema/`
folder and it defines more preciselly the semantics of the questions and exams.

This repository also implements a parser using Markdown-it and a JSON schema
validator. It has a CLI that can be used to validate, lint and transform mdq
files into JSON/YAML.


## Examples and test suite

This repository also contains a test suite in the form of examples. Most
examples are a pair of markdown + yaml files documenting the expected
transformation.

When creating new examples, try use "Brazil core" inspiration. Take elements of
Brazilian culture, history and geography. You can also use established
scientific facts like quantum physics, climate science, Darwinian evolution,
etc. Avoid religion, politics, and football.

## Specifications

`/docs/question-types/*` and `/docs/exam.md` contain detailed specifications for
each question type and exam. In the sections in which it describes the syntax
formally with a example grammar, must use the
[Lark](https://github.com/lark-parser/lark) parser format. The grammar snippets
are not necessarily complete, and may contain undefined rules, but must be
otherwise valid Lark grammar. You can test by copying the snippet into a `.lark`
file, adding the missing rules with some example, e.g., `rule: "example"`, and
running `uv run lark-run <grammar_file> -t <example_file>` on it.

## Typing discipline

* Use `T | None` instead of `Optional[T]` for optional types.
* Use `T | S` instead of `Union[T, S]` for union types.
* Use builtins `list`, `dict`, `tuple`, `set` instead of `List`, `Dict`, `Tuple`, `Set`.
* Check types with mypy `uv run mypy mdq`. 
* Avoid using `Any`, unless it is specifying "value can be anything" and it will still work and always document its usage.
* Model the document tree (questions, exams, grades) with Pydantic models.
* Pydantic models mirror the JSON schemas in `schema/`. They might be stricter
  than the JSON schema, if the spec has a rule that cannot be enforced by schema
  alone. Pydantic models only enforce required rules. An extra linting pass
  may be necessary to catch non-critical violations.

<!-- rtk-instructions v2 -->
# RTK

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile
```bash
rtk lint                # ESLint/Biome violations grouped
rtk prettier --check    # Files needing format only
rtk next build          # Next.js build with route metrics
```

### Test
```bash
rtk pytest              # Python test failures only
```

### Git
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff
rtk git show            # Compact show
rtk git add             # Ultra-compact confirmations
rtk git commit          # Ultra-compact confirmations
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```


### Files & Search
```bash
rtk ls <path>           # Tree format, compact
rtk read <file>         # Code reading with filtering
rtk grep <pattern>      # Search grouped by file. Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory
```

### Analysis & Debug
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Network
```bash
rtk curl <url>          # Compact HTTP responses
rtk wget <url>          # Compact download output
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

<!-- /rtk-instructions -->