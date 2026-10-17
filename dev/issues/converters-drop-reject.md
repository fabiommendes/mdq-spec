---
type: issue
status: open
tags: [mdq-py, convert, gift, moodle, short-answer]
relatedTo: [mdq-py/mdq/convert/_moodle_xml.py, mdq-py/mdq/convert/_gift.py]
---

# Exportadores descartam `reject` de short-answer

GIFT e Moodle XML exportam só `accept`. Os padrões de `reject` e seus
feedbacks somem em silêncio. Moodle XML suporta resposta errada com feedback
(`<answer fraction="0">`), e o lote 6 de automation já usa essa forma para
`incorrectFeedback`. Fazer o mesmo para literais de `reject` (regex continua
`ValueError`). Decidir o que o GIFT faz (`=%0%texto#feedback`?).

Encontrado pelo tester no lote 6 de `dev/specs/to-review/automation.md`.
