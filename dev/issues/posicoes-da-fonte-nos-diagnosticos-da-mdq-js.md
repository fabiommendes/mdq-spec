---
type: issue
status: backlog
tags: [mdq-js, diagnostics, vscode]
relatedTo: [dev/rfc/extensao-vs-code-para-mdq.md, numeros-de-linha-nos-diagnosticos]
kind: enhancement
milestone: vscode-m1
created: 2026-11-05
creator: claude
---

# Posições da fonte nos diagnósticos da mdq-js

Hoje `Diagnostic` tem `path` e só tem `line` em falha de parse. A extensão VS Code precisa de uma faixa para marcar o erro no editor.

- Todo diagnóstico com `path` (schema, lint, chave desconhecida) ganha a faixa da fonte: linha e coluna de início e de fim.
- Markdown: precisão de linha ou de bloco, a partir do `node.map` do markdown-it.
- JSON e YAML: precisão de nó. Investigar um parser YAML que guarde posições (o pacote `yaml` guarda) e reusar o mesmo para JSON.
- Desenhar o formato junto com a issue da mdq-py (`numeros-de-linha-nos-diagnosticos`), para que as duas implementações produzam a mesma faixa. A mdq-js sai primeiro.
