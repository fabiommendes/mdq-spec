---
type: issue
status: open
tags: [mdq-py, conversores, short-answer]
relatedTo: [docs/references/patterns.md, mdq-py/mdq/convert/_base.py]
---

# Import do Moodle recusa resposta com crase

`mdq.convert._base.literal_pattern` ainda recusa uma resposta do Moodle que
contém crase. Desde a D12 da auditoria de short-answer, o literal exato aceita
N crases (code span do CommonMark), e `mdq._exact.exact_span()` gera a forma
certa. Usar `exact_span()` e trocar o teste
`mdq-py/tests/test_short_answer_accept_only.py` (por volta da linha 712), que
hoje exige o erro.
