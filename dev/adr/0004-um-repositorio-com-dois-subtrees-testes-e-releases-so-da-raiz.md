---
type: adr
status: accepted
tags: [git, ci, release, mdq-py, mdq-js]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Um repositório com dois subtrees; testes e releases só da raiz

## Contexto

A spec (`docs/`, `schema/`, `examples/`) e as duas implementações são
publicadas em três repositórios GitHub, mas as implementações leem a spec e o
corpus do diretório pai. Um clone isolado de `mdq-py` ou `mdq-js` não consegue
rodar os próprios testes.

Evidência:

- Commits `89b83fd` e `5a5333a` (2026-09-23): "Add mdq-py as a subtree", "Add
  mdq-js as a subtree" (`git-subtree-dir`, `git-subtree-split`).
- Commit `35835a1` (2026-09-23): "Document the git subtree layout and keep
  dev/ local".
- `AGENTS.md:220-265` ("Git layout"): um repositório, dois subtrees, remotes
  `origin`, `mdq-py`, `mdq-js`; git só da raiz; um commit por subtree quando
  possível; `dev/` só no root; push do root primeiro; "A standalone clone of a
  subtree repository cannot run its test suite"; releases rodam daqui.
- `.github/workflows/ci.yml:1-3`: "The subtree repositories (mdq-py, mdq-js)
  cannot run their tests on their own: they read docs/, schema/ and examples/
  from this repository. So the tests of both implementations run here."
- `.github/workflows/release-mdq-py.yml:1-3`: a release da mdq-py roda neste
  repositório, após os testes, a partir de uma tag `mdq-py-v<versão>`.
- `mdq-py/tests/_corpus.py:4-6`: os caminhos resolvem um nível acima de
  `mdq-py/` e "mean nothing outside this checkout".

## Opções

1. Três repositórios independentes, com a spec copiada ou vendorizada em cada
   implementação.
2. Um repositório de trabalho com `mdq-py/` e `mdq-js/` como git subtrees;
   os repositórios das implementações são espelhos publicados; testes, CI e
   releases rodam só da raiz.

## Decisão

Opção 2. Todo trabalho acontece neste repositório. `mdq-py/` e `mdq-js/` são
subtrees sem `.git` próprio. Os testes das duas implementações e o audit da
spec rodam na CI da raiz. A release da mdq-py parte de uma tag na raiz.
`dev/` fica só no root.

Razão registrada (`ci.yml:1-3`, `AGENTS.md:259-263`): as implementações leem
`docs/`, `schema/` e `examples/` da raiz, então o clone de um subtree não
roda a própria suíte.

## Consequências

- Nunca rodar `git init` ou `git clone` dentro de `mdq-py/` ou `mdq-js/`.
- Um commit que mistura raiz e subtree aparece no repositório do subtree com
  uma mensagem que descreve mudanças que não estão lá.
- Push em três etapas: `origin`, depois `git subtree push` para cada subtree.
- O repositório publicado de cada implementação não tem CI própria útil; quem
  contribui precisa deste repositório.
- Trazer commits feitos direto no subtree exige `git subtree pull` sem
  `--squash`.
