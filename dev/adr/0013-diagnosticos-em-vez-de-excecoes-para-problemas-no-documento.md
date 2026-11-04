---
type: adr
status: accepted
tags: [mdq-py, mdq-js, diagnostics, lint]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Diagnósticos em vez de exceções para problemas no documento

## Contexto

Até 2026-09-24 a mdq-py tinha `validator.py` sobre `jsonschema` e um linter em dict separado dos modelos; `mdq validate` não aplicava regras só do modelo (commit a929489, 2026-09-24). As regras de lint viviam fora dos modelos e precisavam de checagens de forma próprias (`mdq-py/mdq/models/_lint.py:25-30`). Os conversores GIFT/Aiken/Moodle levantavam exceção para um grade ou regex que não cabia no formato (`mdq-py/CHANGELOG.md:25`).

## Opções

1. Exceções: a primeira falha interrompe; o chamador pega uma por vez.
2. Diagnósticos: `load`/`parse` devolvem o documento e a lista de `Diagnostic` com severidade, código e local.

## Decisão

Opção 2:

- `mdq._loading` é o único caminho de Markdown/dados até o modelo: parse, Pydantic, lint. Nunca levanta exceção por um problema no documento; só por um problema na chamada (arquivo inexistente, `format` desconhecido) (`mdq-py/mdq/_loading.py:1-13`; `mdq-py/mdq/_diagnostics.py`). Razão: `mdq validate` e a biblioteca passam pelo mesmo caminho, e regras só do modelo falham a validação (commit a929489).
- `validator.py` apagado; `jsonschema` é dependência só de dev e um teste checa que schema e modelos concordam no corpus (commit a929489; `mdq-py/pyproject.toml:41-44`).
- Regras advisórias rodam em `lint()` de cada classe de questão e de `Exam`; regras críticas são validadores de modelo e `load()` as reporta como erro (commit d967efd, 2026-09-28; `mdq-py/mdq/models/_lint.py:25-36`).
- Uma severidade por código de lint (`mdq-py/CHANGELOG.md:200`). Ids e textos duplicados (`duplicate-choice-id`, `duplicate-choice-text`, `duplicate-question-id`) são erros (`docs/lint-codes.md:78-82`).
- Conversores fazem o possível e devolvem `Converted` com avisos; erro fica só para saída sem sentido (`mdq-py/CHANGELOG.md:22-25`).
- Na mdq-js, `validateDocument` devolve `ValidationResult` em vez de lançar. Razão registrada: um documento inválido é resultado comum; a CLI reporta todos os problemas e um editor os mostra enquanto digita (`mdq-js/src/validate.ts:27-30`).

## Consequências

- `mdq.parse` levanta `InvalidDocument` só acima de um limiar de severidade (commit a929489).
- `invalid-frontmatter-field` e `redundant-id` saem do parser por um sink de avisos, porque um documento já parseado não os mostra (`mdq-py/mdq/models/_lint.py:31-36`).
- Cada código de conversor tem severidade declarada em `mdq.convert.CONVERTER_CODES`.
