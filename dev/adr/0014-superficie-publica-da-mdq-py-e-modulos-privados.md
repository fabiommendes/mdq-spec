---
type: adr
status: accepted
tags: [mdq-py, api, layout]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Superfície pública da mdq-py e módulos privados

## Contexto

Antes da reestruturação de 2026-09-28, `loading.py` e `loaders.py` eram públicos com nomes confusos, `schedule.py` e `testing.py` iam no wheel, e `mdq.hypothesis` levava estratégias de teste dos conversores para o pacote (commits 484437a, 3fd07bc, 1e75f0d). O plano da reestruturação registrou: pacote em 0.1.0, não publicado no PyPI sob a nova API, autor é o único usuário (`dev/refactor/mdq-py-restructure.md:31-32,181-184` em HEAD; arquivo apagado no working tree).

## Opções

1. Manter os módulos públicos e adicionar shims de compatibilidade a cada renome.
2. Fixar uma superfície pública pequena, tornar o resto `_privado` e quebrar os caminhos antigos.

## Decisão

Opção 2 (`mdq-py/AGENTS.md`, "Package layout"):

- Módulos públicos, cada um com página em `mdq-py/docs/api/`: `mdq`, `mdq.models`, `mdq.types`, `mdq.errors`, `mdq.convert`, `mdq.hypothesis`. `mdq.cli` expõe só `app`/`main` e não é API.
- Todo o resto é `_module`, importado só pelo pacote pai ou irmãos; testes podem importar privados, host e docs nunca. Exceção conhecida: `cli/_show.py` importa `models/_render.py`.
- Layout: `_parser/` e `models/` com um arquivo por família de questão (D2 do plano), `convert/` um por formato com módulos de formato privados (D1), `cli/` um por comando.
- Sem shims para caminhos antigos (D3 do plano). Razão registrada: o autor é o único usuário.
- Fixtures e tooling fora do wheel: `mdq/testing.py` vira `tests/_corpus.py`, `mdq/scripts/` vira `scripts/`, estratégias dos conversores vão para `tests/strategies/` e `mdq.hypothesis` exporta só questões e provas (commit 1e75f0d).
- `mdq/__init__.py` exporta exatamente: `load`, `parse`, `Loaded`, `Diagnostic`, `Severity`, `Question`, `Exam`, `QuestionBank`, `FileLoader`, `DictLoader`, `MdqError`, `InvalidDocument` (commit 484437a).

## Consequências

- `Source`, `Format`, `Kind`, `Ids` moram em `mdq.types`, o único lugar para anotar parâmetros de `load()`/`parse()`.
- Um clone isolado do subtree não roda os testes: `tests/_corpus.py` lê `examples/` da raiz.
- Renomes futuros dentro do pacote não exigem changelog de API enquanto ficam em `_module`.
