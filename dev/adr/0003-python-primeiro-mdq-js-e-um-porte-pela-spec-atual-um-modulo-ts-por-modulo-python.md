---
type: adr
status: accepted
tags: [mdq-js, mdq-py, port, architecture]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Python primeiro; mdq-js é um porte pela spec atual, um módulo TS por módulo Python

## Contexto

O projeto tem duas implementações do mesmo formato. Era preciso decidir quem
define o comportamento em caso de divergência, quanto da superfície da mdq-py
o TypeScript cobre, como os módulos se correspondem e como rastrear o que
ainda não foi portado.

Evidência:

- `AGENTS.md:174-191` ("Python vs Typescript conventions"): Python é a
  linguagem padrão; o TypeScript é um porte, escrito e validado primeiro em
  Python.
- `mdq-js/AGENTS.md:25-29`: "Python decides. When a TypeScript expectation and
  mdq-py disagree, run the case in mdq-py and fix the TypeScript side."
  TypeScript idiomático, sem classes de modelo, layout de módulos paralelo.
- `mdq-js/docs/sync/README.md:9-10`: a implementação Python é a referência e a
  fonte autoritativa para comportamento e casos de borda. `:61-65`: se os docs
  deixam margem, a Python prevalece.
- `mdq-js/docs/sync/README.md:41-57`: ficam só em Python a CLI ("not worth
  the effort to replicate"), os conversores de formato, `render()` e
  `FileLoader`. O TypeScript tem `DictLoader`, a interface `QuestionBank` e os
  componentes SolidJS.
- `mdq-js/docs/sync/roadmap.md:49-54` e `modules.md:8-12`: um módulo TS por
  módulo Python, mesmo nome sem o underscore inicial, em kebab-case; um módulo
  que difere declara o motivo no comentário de cabeçalho.
- `mdq-js/docs/sync/testing.md:118-127`: `tests/not-ported.ts` lista os
  exemplos que o porte ainda não trata, por camada, com motivo; cada um roda
  como `it.fails` e passa a falhar quando começa a passar, para a lista não
  envelhecer.
- `dev/rfc/0001-mdq-js-paridade.md:48-54` e `:142-146`: arquitetura paralela,
  "Python decide", porte mira um commit fixo da mdq-py.

## Opções

1. Duas implementações independentes que seguem a spec, cada uma com a sua
   leitura.
2. Python é a referência; o TypeScript é um porte com módulos paralelos, API
   idiomática, cobertura menor (sem CLI, conversores, render, FileLoader) e
   lista explícita do que falta.

## Decisão

Opção 2. Toda funcionalidade nasce e é validada na mdq-py. A mdq-js porta pela
spec atual e pela mdq-py, um módulo TS por módulo Python, com objetos simples
em vez de classes. Divergência se resolve rodando o caso na mdq-py. CLI,
conversores, `render()` e `FileLoader` ficam só em Python. O que não foi
portado fica em `tests/not-ported.ts` como `it.fails`.

Razões registradas: para usuários de CLI a linguagem não importa
(`sync/README.md:44-46`); o layout paralelo deixa o leitor achar o arquivo de
referência (`mdq-js/AGENTS.md:27-29`); a lista `it.fails` não pode ficar
desatualizada (`sync/testing.md:124-127`).

## Consequências

- Uma mudança de comportamento começa na mdq-py e no corpus; a mdq-js segue.
- Um exemplo novo que a Python adiciona falha de imediato na mdq-js até ser
  portado ou listado em `not-ported.ts`.
- Um módulo TS com nome ou divisão diferente precisa de justificativa no
  cabeçalho.
- Quem precisa de CLI, conversão ou escrita de MDQ usa a mdq-py.
