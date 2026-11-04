---
type: adr
status: accepted
tags: [spec, public-form, exam, seguranca]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Forma apresentada com rótulos SHA-256 e seleção semeada

## Contexto

A forma pública de uma questão ainda expõe os ids de autoria (`correct`, `c1`) e a ordem do documento. A ameaça é um aluno que lê a API ou o tráfego de rede; a tela não importa, porque o cliente não mostra ids. O host precisa reconstruir a mesma apresentação a cada pedido sem guardar estado (`docs/public-form.md:320-329`). O mesmo problema vale para `includeAll` com `max`: cada implementação tem de escolher as mesmas questões para a mesma seed (`docs/exam.md:281-292`).

## Opções

1. Rótulos aleatórios por requisição, com estado no host.
2. Rótulos e ordem derivados da seed por hash, sem estado.

## Decisão

Opção 2:

- Presentation label: SHA-256 de seed e key parts (`qid`, blank id, choice id) unidos por U+0000, em UTF-8; o rótulo é o menor prefixo de 8, 16, 32 ou 64 dígitos hex que nenhum outro digest do scope compartilha (`docs/public-form.md:355-360`).
- `shuffle: true` ordena as choices pelo rótulo, como strings (`docs/public-form.md:367-369`). Razão registrada: ordem repetível a partir da seed, sem estado.
- Seleção semeada de `includeAll`: `max` mantém os candidatos com o menor SHA-256 de seed e id da questão (`docs/exam.md:288-292`; `CHANGELOG.md:18`).
- A seed é escolhida pelo host, imprevisível para o aluno (ex.: `HMAC(secret, username:exam_id)`); a implementação não lida com segredos (`docs/public-form.md:331-334`).
- Vetores em `examples/presentation.yaml` e `examples/selection.yaml`. Python em `mdq-py/mdq/models/_presentation.py:35-45` (`hashlib`); JS em `mdq-js/src/models/presentation.ts:11-16` com `@noble/hashes`, SHA-256 síncrono que roda no browser e em Node ESM.

## Consequências

- Ids de autoria não chegam ao cliente; uma resposta apresentada carrega rótulos e um rótulo desconhecido é resposta malformada (`CHANGELOG.md:19`).
- Ordering não tem scope: o pool é público e canônico, e o host embaralha (`docs/public-form.md:350-351`).
- `@noble/hashes` é dependência da mdq-js.
