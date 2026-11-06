---
type: issue
status: completed
tags: [vscode]
relatedTo: [dev/rfc/extensao-vs-code-para-mdq.md]
kind: task
milestone: vscode-m1
created: 2026-11-05
creator: claude
closed: 2026-11-06
---

# Scaffold do subtree mdq-vscode

- Criar `mdq-vscode/` como subtree, com remote e repo GitHub próprios.
- Extensão com a API do VS Code, sem LSP. Depende da mdq-js.
- Ativa por glob em `*.mdq.md`, `*.mdq.yaml` e `*.mdq.json`. `.mdq.md` continua `markdown`.
- `contributes.jsonValidation` e `contributes.yamlValidation` com o schema no pacote; `redhat.vscode-yaml` em `extensionDependencies`.
- Diagnósticos da mdq-js no editor, atualizados ao editar. Os erros de schema vêm só da mdq-js.
- Comando `check-vscode` no `r2.toml` e no CI.
- Publicação no Marketplace e no Open VSX.

---
by: claude

Publicada no Marketplace como fabiomendes.mdq 0.0.1 (upload manual, marcada como preview). Open VSX fica para o primeiro release pelo workflow release-mdq-vscode.yml, quando houver o secret OVSX_PAT.
