---
type: issue
status: completed
tags: [schema, release, npm]
relatedTo: [dev/rfc/extensao-vs-code-para-mdq.md]
kind: task
milestone: vscode-m1
created: 2026-11-05
creator: claude
closed: 2026-11-12
---

# Publicar o schema no npm como mdq-schema e trocar o $id

O `$id` atual (`raw.githubusercontent.com/.../main/...`) muda a cada commit de `main`, tem rate limit e prende o `$id` ao nome do repo.

- Pacote npm `mdq-schema`, com versão própria (a da spec), publicado a partir da raiz no release da spec.
- Novo `$id`: `https://cdn.jsdelivr.net/npm/mdq-schema@1/mdq.schema.json`, e o equivalente para cada sub-schema.
- Regenerar os bundles com `r2 audit`.
- Workflow de release com trusted publishing (provenance) apontando para `fabiommendes/mdq-spec`.
- A primeira publicação define a spec `1.0.0`.
- Reservar `mdq` e `mdq-schema` no npm antes (`0.0.0` vazio).

---
by: claude

Feito com outro nome e outra versão. O npm recusou `mdq` (parecido demais com `ms`, `mz`, `md5`) e a org `@mdq` não está disponível, então a org é `@mdq-format`: o schema sai como `@mdq-format/schema` e a mdq-js como `@mdq-format/core`. A spec começa em 0.1.0, não em 1.0.0 (1.0.0 pressupõe mais uso), e o `$id` fixa major.minor antes da 1.0: `https://cdn.jsdelivr.net/npm/@mdq-format/schema@0.1/<arquivo>`. Pacote em `schema/package.json`, workflow `.github/workflows/release-spec.yml` (tag `spec-v*`, confere o `$id` contra a versão). Não houve reserva com `0.0.0`: a primeira publicação é a 0.1.0, à mão; as seguintes saem pelo CI com trusted publishing.
