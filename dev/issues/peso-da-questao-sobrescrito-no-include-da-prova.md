---
type: issue
status: backlog
tags: [spec, exam, weight]
relatedTo: [docs/exam.md, docs/question-types/question-base.md, mdq-js/src/models/score.ts]
kind: enhancement
created: 2026-11-05
creator: claude
---

# Peso da questão sobrescrito no include da prova

## Problema

O peso de uma questão só existe no frontmatter dela (`weight`, padrão 1), e o
bloco de `include` da prova não aceita outro campo além do id
(`docs/exam.md`, "Question and include blocks"). Quem monta provas a partir de
um banco de questões precisa dar pesos diferentes à mesma questão em provas
diferentes: uma questão vale 3 numa prova curta e 1 numa longa. Hoje a única
saída é duplicar o arquivo da questão, o que quebra o vínculo entre as cópias.

Caso real: a Prova 1 de Paradigmas (Codehood) veio do Moodle com pesos 3, 3,
3, 2 e 1 nas demais. No Moodle o peso é da questão dentro do quiz, não da
questão do banco.

## Proposta

- `include` aceita um `weight` opcional, que sobrepõe o `weight` da questão
  incluída só naquela prova. Mesma regra do campo da questão: não negativo,
  `null` é o mesmo que ausente.
- Avaliar se `includeAll` também aceita `weight`, aplicado a todas as questões
  que a consulta adicionar.
- A fórmula de "Exam score" continua `Σ wᵢ·pᵢ / Σ wᵢ`, com `wᵢ` sendo o peso do
  include quando houver, senão o da questão.
- Schema JSON, exemplos do corpus, mdq-py e mdq-js (`scoreExam` em
  `mdq-js/src/models/score.ts`).

## Relacionado

Issue gêmea no Codehood: `dev/issues/peso-da-questao-por-prova.md`, que guarda
o override em `QuestionsForExam`.
