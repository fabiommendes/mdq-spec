---
type: issue
status: backlog
tags: [scripts, spec]
kind: task
created: 2026-11-04
creator: claude
---

# spec_audit: linha schema-error precisa de constraint no schema

Do `BACKLOG.md` (migrado em 2026-11-04).

`scripts/spec_audit.py` deve conferir que cada linha das tabelas "Additional
Rules" com o código `schema-error` tem uma constraint correspondente
(`minimum`, `pattern`, `enum`, ...) no caminho do campo dentro do schema, e que
o texto da regra termina em "(schema)" se e somente se o código é
`schema-error`.
