---
type: rfc
status: draft
tags: [vscode, mdq-js, schema, diagnostics]
relatedTo: [dev/rfc/0002-componentes-solid.md, numeros-de-linha-nos-diagnosticos, async-question-banks]
created: 2026-11-05
creator: claude
---

# Extensão VS Code para MDQ

## Contexto

- Quem escreve MDQ no VS Code não tem validação nem pré-visualização. Os erros
  só aparecem ao rodar `mdq validate` ou ao importar no codehood.
- A mdq-js já tem o que a extensão precisa: parser, validação (schema + lint),
  `Diagnostic` e os componentes Solid (modos `answer`, `readonly`, `review`).
- O `$id` dos schemas aponta para `raw.githubusercontent.com/.../main/...`.
  Essa URL muda a cada commit de `main`, tem rate limit e prende o `$id` ao
  nome do repo.

## Objetivo

Uma extensão VS Code que:

1. valida `.mdq.md`, `.mdq.yaml` e `.mdq.json` e mostra erros e avisos no
   editor (squiggles e painel Problems);
2. dá completion e hover nos arquivos JSON e YAML a partir do schema;
3. mostra a pré-visualização de uma questão nos modos aluno e gabarito.

## Decisões

1. **Local.** Novo subtree `mdq-vscode/` neste repo, com remote próprio.
   Os testes usam `examples/` e `schema/` da raiz, como mdq-py e mdq-js.
2. **Arquitetura.** Extensão com a API do VS Code (diagnostics + webview).
   Sem LSP no primeiro momento. A lógica fica na mdq-js; a extensão só faz a
   ponte. Um LSP pode vir depois, se outros editores pedirem.
3. **Arquivos MDQ.** Reconhecidos por glob: `*.mdq.md`, `*.mdq.yaml`,
   `*.mdq.json`. `.mdq.md` continua com language id `markdown` (mantém o
   highlight e os recursos de Markdown). Detecção pelo frontmatter em `.md`
   comum fica para o milestone 2.
4. **Schema no editor.** A extensão leva o schema no pacote e o registra com
   `contributes.jsonValidation` e `contributes.yamlValidation` (este último lido
   pela `redhat.vscode-yaml`, declarada em `extensionDependencies`). Funciona
   offline. Os erros de schema vêm só do validador da mdq-js, para não duplicar
   diagnóstico; o registro serve para completion e hover.
5. **`$schema` no documento.** A spec aceita uma chave `$schema` opcional
   (string, formato `uri`) na raiz de documentos JSON e YAML. Qualquer URL é
   aceita (espelho, cópia local). O parser a ignora: ela não entra no modelo e
   `mdq serialize` não a emite. Em YAML, a documentação recomenda também o
   modeline `# yaml-language-server: $schema=<url>`.
6. **Distribuição do schema.** Pacote npm `@mdq/schema`, publicado no release
   da spec, com versão própria (independente de mdq-py e mdq-js). O `$id`
   oficial passa a ser
   `https://cdn.jsdelivr.net/npm/@mdq/schema@1/mdq.schema.json`. Pacote npm
   é imutável, e o jsDelivr (com o unpkg de espelho) continua servindo mesmo
   que o projeto pare. Domínio próprio foi descartado para o `$id`: se
   expirar, a URL quebra ou passa para outro dono. A primeira publicação define
   a spec `1.0.0`.
7. **Distribuição da extensão.** VS Code Marketplace e Open VSX (VSCodium,
   Cursor).

## Milestones

**M1 (MVP)**

- Posições nos diagnósticos da mdq-js: todo `Diagnostic` com `path` ganha a
  faixa da fonte. Em Markdown a precisão é de linha (markdown-it só dá
  `node.map`); em JSON e YAML, de nó.
- Squiggles nos três formatos, atualizados ao editar.
- Registro do schema (decisão 4).
- Pré-visualização de uma questão em webview: modo aluno (`answer`) e
  gabarito (`review`), com o CSS `plain.css` da mdq-js.
- `$schema` opcional na spec, nos schemas e nas duas implementações.
- Pacote `@mdq/schema` e troca do `$id`.

**M2**

- Detecção de `.md` MDQ pelo frontmatter.
- Modo professor: resposta, feedback, pesos e metadados juntos. Não existe em
  nenhum componente hoje; entra primeiro na mdq-js.
- Pré-visualização de exames e de `include`: precisa ler arquivos do workspace
  (depende de `async-question-banks`).
- Posições nos diagnósticos da mdq-py (issue `numeros-de-linha-nos-diagnosticos`).

**Depois**

- Quick fixes a partir dos códigos de lint.
- Entrada no catálogo do SchemaStore.
- LSP para outros editores.

## Questões abertas

- Nome do pacote npm da mdq-js. Proposto: `@mdq/mdq-js`. A RFC 0002 usa o
  subpath `mdq/solid`, que passaria a ser `@mdq/mdq-js/solid`.
- Reserva dos nomes no npm (org `@mdq`) antes do primeiro release.
- Ordem "Python primeiro": as posições nos diagnósticos e o modo professor
  saem primeiro na mdq-js, porque a extensão depende dela.

---
by: claude

Decidido: o pacote npm da mdq-js passa a ser `@mdq/core`, com subpath `@mdq/core/solid` (pacote único da RFC 0002). Pendente: confirmar que a org `@mdq` está livre no npm.

---
by: claude

Revisado: a org `@mdq` não está disponível no npm. Os pacotes ficam sem escopo: `mdq` (mdq-js, subpath `mdq/solid`, mesmo nome do PyPI) e `mdq-schema`. O `$id` oficial passa a ser `https://cdn.jsdelivr.net/npm/mdq-schema@1/mdq.schema.json`. Substitui o comentário anterior sobre `@mdq/core` e o nome `@mdq/schema` da decisão 6. Org de terceiro (`@codehood`) descartada: o MDQ não deve ficar preso ao codehood.
