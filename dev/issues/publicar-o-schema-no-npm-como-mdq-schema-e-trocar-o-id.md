---
type: issue
status: backlog
tags: [schema, release, npm]
relatedTo: [dev/rfc/extensao-vs-code-para-mdq.md]
kind: task
milestone: vscode-m1
created: 2026-11-05
creator: claude
---

# Publicar o schema no npm como mdq-schema e trocar o $id

O `$id` atual (`raw.githubusercontent.com/.../main/...`) muda a cada commit de `main`, tem rate limit e prende o `$id` ao nome do repo.

- Pacote npm `mdq-schema`, com versão própria (a da spec), publicado a partir da raiz no release da spec.
- Novo `$id`: `https://cdn.jsdelivr.net/npm/mdq-schema@1/mdq.schema.json`, e o equivalente para cada sub-schema.
- Regenerar os bundles com `r2 audit`.
- Workflow de release com trusted publishing (provenance) apontando para `fabiommendes/mdq-spec`.
- A primeira publicação define a spec `1.0.0`.
- Reservar `mdq` e `mdq-schema` no npm antes (`0.0.0` vazio).
