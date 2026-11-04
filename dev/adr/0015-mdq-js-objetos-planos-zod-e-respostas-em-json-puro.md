---
type: adr
status: accepted
tags: [mdq-js, api, zod]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# mdq-js: objetos planos, Zod e respostas em JSON puro

## Contexto

A mdq-js é um port da mdq-py, que usa classes Pydantic com métodos. Em Python isso exige duplicar modelos e TypedDicts e mantê-los em sincronia à mão (`mdq-js/docs/sync/schemas.md:26-29`). Um consumidor que compõe os schemas exportados precisa da mesma cópia do zod ou os tipos não batem; zod 4.5 mudou como reporta issues de union e quebrou quatro diagnósticos do corpus (commit 74af593, 2026-10-28). A spec define as respostas como JSON: a resposta de multiple selection é a lista de ids marcados (`docs/responses.md:47,70`).

## Opções

1. Transliterar: classes de modelo em TS embrulhando os objetos validados pelo Zod (`mdq-js/docs/sync/schemas.md:31-36`).
2. Objetos planos validados pelo Zod, comportamento em funções que despacham por `type`.

## Decisão

Opção 2:

- Sem classes de modelo; métodos Python viram funções (`mdq-js/AGENTS.md:27-28`; `dev/rfc/0001-mdq-js-paridade.md:55-56`). Razão registrada: tipagem estrutural é o comum no ecossistema TS, o objeto pode ser passado a outras libs e virar JSON sem conversão, e o Zod dá tipos e validação de uma definição só (`mdq-js/docs/sync/schemas.md:21-36`).
- Regras de modelo (ids únicos, regex que compila) são funções em `models/<família>.ts` que devolvem diagnósticos, chamadas por `validateDocument` e `load` depois do Zod; `schema/` fica um espelho mecânico do JSON Schema (RFC 0001, D1, aceita em 2026-10-27, `dev/rfc/0001-mdq-js-paridade.md:122-130`; `mdq-js/docs/sync/roadmap.md:42-47`).
- Respostas em JSON puro: objetos, arrays, strings e números; sem `Set` nem `Map`, para gravar e carregar de fixture sem conversão (`mdq-js/docs/sync/roadmap.md:24-27`).
- `zod` é peer dependency com faixa fixada `^4.3.6`; as unions de exam são validadas membro a membro para que os diagnósticos não dependam de como o zod reporta issues de union (commits 74af593, fefe55a, 2026-10-28; `mdq-js/package.json:46-49`).

## Consequências

- Uma regra de modelo só roda se o schema aceitou; o corpus inválido tem uma violação por exemplo, então o resultado não muda (RFC 0001, D1).
- Sem tipagem nominal nos objetos de questão.
- Python decide: divergência se resolve rodando o caso na mdq-py (`mdq-js/AGENTS.md:24-26`).
