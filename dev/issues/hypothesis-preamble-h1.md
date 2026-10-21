---
type: issue
status: open
tags: [mdq-py, hypothesis, testes]
relatedTo: [mdq-py/tests/test_exam_render.py, mdq-py/mdq/hypothesis/]
---

# Estratégia Hypothesis gera preâmbulo `# `

`tests/test_exam_render.py::test_render_exam_roundtrip` falha de forma
reproduzível com o banco `.hypothesis/` local: a estratégia gera um `Essay`
com `preamble: "# "`, um H1 vazio, que o modelo rejeita com
`forbidden-block-element`. Falha também no `HEAD` (`0285b44`) com o mesmo
banco; não vem da auditoria de short-answer.

Correção: a estratégia de texto de bloco não deve gerar linhas que viram
heading ATX (`#` seguido de espaço ou fim de linha).

Atualização 2026-10-20: o campo `preamble` saiu do formato (auditoria de
fill-in, D1) e o stem passou a ser gerado por `md_safe_multi_blocks`. O teste
passou em 4 execuções seguidas da suíte. Confirmar se `md_safe_multi_blocks`
evita `# ` e então apagar este issue.
