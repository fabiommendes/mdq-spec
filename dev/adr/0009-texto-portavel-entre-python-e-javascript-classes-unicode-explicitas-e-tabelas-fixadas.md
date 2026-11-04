---
type: adr
status: accepted
tags: [spec, portabilidade, unicode, regex]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Texto portável entre Python e JavaScript: classes Unicode explícitas e tabelas fixadas

## Contexto

A spec tem duas implementações (mdq-py, mdq-js) que devem dar o mesmo resultado para o mesmo documento. Os runtimes divergem em texto:

- `\s`, `\w` e `\d` não coincidem entre Python `re`, JavaScript `RegExp` e JSON Schema `pattern`: JS `\s` casa U+FEFF e Python não; Python `\s` casa U+0085 e U+001C a U+001F (`docs/references/grammar.md:18-24`).
- Python `\d` casa dígitos Unicode não ASCII: `[numeric]: ٣` era lido como 3 (commit aeb8bb7, 2026-09-28).
- A categoria geral de um code point já atribuído muda entre versões do Unicode, e `str.casefold()` depende da versão do interpretador (`docs/references/patterns.md:125-133`; `mdq-py/CHANGELOG.md:319-324`).
- O slug de um texto depende da tabela de transliteração da biblioteca usada (`mdq-js/src/types/unidecode.d.ts:1-5`).

## Opções

1. Usar os atalhos do runtime (`\s`, `\w`, `\d`, `str.casefold`, `unicodedata` do interpretador) e aceitar divergências entre as implementações.
2. Definir classes explícitas na spec, fixar as tabelas Unicode em arquivo gerado e restringir regex a um subconjunto comum.

## Decisão

Opção 2, em cinco regras:

- Os terminais da gramática usam só classes explícitas; `UNICODE_SPACE` lista os 25 code points de `White_Space` (`docs/references/grammar.md:25-27`; `mdq-py/mdq/_markdown.py:44-50`). Razão: o mesmo documento tem de parsear igual nas duas implementações.
- Regex de resposta (short answer, fill-in) é um subconjunto fechado da sintaxe JS com flag `u`, com `\w` e `\d` ASCII; construto fora da tabela é `invalid-regex` (`docs/references/patterns.md:400-409,539-541`). Razão: portabilidade, o corpo tem o mesmo significado em todo engine.
- Inexact literal usa as tabelas `nonspacing` e `caseFolding` de `docs/references/inexact-tables.json` (Unicode 18.0.0, CLDR 48), geradas por `scripts/inexact_tables.py`, e nunca a categoria ou o case folding do runtime (`docs/references/patterns.md:125-133`). Os marcadores true/false usam `unicodedata2>=17,<18` fixado (`mdq-py/CHANGELOG.md:214`).
- Dígitos só ASCII (`[0-9]`) em respostas numéricas, scores e listas ordenadas (commit aeb8bb7).
- Slugs usam a tabela Text::Unidecode nos dois lados (`python-slugify` e `unidecode`), para o mesmo slug de qualquer texto (`mdq-js/src/types/unidecode.d.ts:1-5`).

Na mdq-js, toda `RegExp` usa `u` e um padrão portado do Python que depende de Unicode usa `\p{L}`, `\p{N}` (`mdq-js/docs/sync/roadmap.md:28-39`).

## Consequências

- `/\w+/` não aceita `José`; o autor usa a flag `n` ou uma classe explícita (`docs/references/patterns.md:539-541`).
- Toda diferença entre runtimes encontrada vira exemplo no corpus.
- Atualizar o Unicode exige regerar `inexact-tables.json` com o script e copiar para os dois subtrees; `--check` falha na CI se uma cópia divergir.
