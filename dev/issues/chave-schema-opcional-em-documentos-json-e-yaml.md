---
type: issue
status: completed
tags: [spec, schema, mdq-py, mdq-js]
relatedTo: [dev/rfc/extensao-vs-code-para-mdq.md]
kind: enhancement
milestone: vscode-m1
created: 2026-11-05
creator: claude
closed: 2026-11-05
---

# Chave $schema opcional em documentos JSON e YAML

Os schemas de tipo usam `unevaluatedProperties: false`, então hoje `$schema: ...` num documento é erro de chave desconhecida.

- A spec aceita `$schema` (string, formato `uri`) na raiz de documentos JSON e YAML, com qualquer URL.
- O parser ignora a chave: ela não entra no modelo, e `mdq serialize` não a emite.
- A documentação recomenda também o modeline `# yaml-language-server: $schema=<url>` em YAML.
- Exemplos válidos em `examples/`, depois mdq-py e mdq-js.
