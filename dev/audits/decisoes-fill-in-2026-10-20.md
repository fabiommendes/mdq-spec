---
type: decision-log
status: closed
tags: [auditoria-spec, fill-in]
relatedTo: [dev/audits/spec-fill-in-2026-10-20/, docs/question-types/fill-in.md, docs/responses.md]
---

# Decisões da auditoria de fill-in (2026-10-20)

Relatório: `docs/audits/spec/report.pdf` (28 achados, 7 issues).

## Lote M (mecânico)

Achados F8, F9, F10, F19, F29, F30 e F32:

- F8, F9, F29, F30: descrições de `schema/fill-in.yaml` (tag sem sufixo é sempre choice; ShortAnswerBlank só tem listas `accept`/`reject`; `accept` cita `[^id/short-answer]`; `grading` cita a entrada `fill-in` do mapa do exame; `unmatched` cita o default por blank).
- F10: o termo é "choice blank" em prosa e títulos; o `type` JSON continua `multiple-choice`.
- F19: `patterns` da linha 197 igual à da linha 291.
- F32: `stem : inline_md* (blank inline_md*)+`.

## D1. Fundir `preamble` e `stem` (lote B, base de todos os tipos)

Achados F2 (e base de F1, F26). Decidido em 2026-10-20.

- O campo `preamble` sai do formato. `stem` passa a ter todos os blocos entre a frontmatter (e o slug) e o corpo da questão: um ou mais blocos.
- Motivo: nenhum consumidor usa a separação (os conversores Moodle, GIFT e Aiken e o `mdq show` juntam os dois), os formatos de referência têm um texto só, e a fronteira (último parágrafo) é heurística e quebra cloze em vários parágrafos.
- Sai o SHOULD "o stem é um parágrafo". As regras de elementos proibidos e `blank-text` passam a valer só para `stem` e `epilogue`.
- `preamble` em YAML/JSON passa a ser `schema-error`; na frontmatter, `invalid-frontmatter-field`.
- O nome continua `stem` (termo usual de item writing; `body` já é o corpo da questão, `text` e `prompt` são ambíguos).
- Fill-in: um blank pode aparecer em qualquer parágrafo do stem.

## D1b. Resultado de um `[^x]` em cada contexto do stem (lote C)

Achados F1, F26, F33, F34. Decidido em 2026-10-20.

- Código (cerca, bloco indentado, code span) é texto literal, também no stem.
- Heading, item de lista, célula de tabela, blockquote, ênfase, texto de link ou alt de imagem no stem: `misplaced-blank` (error). O parse inline do parágrafo inteiro vem primeiro.
- `[^x](url)` e `[^x][ref]` são links, não blanks.
- O epílogo é texto literal.
- Exemplo `examples/invalid/fill-in-misplaced-blank-code-span` vira válido (texto). Renomear os exemplos com "preamble" no nome para "stem".

## D5. Glossário

"Stem" entrou no `GLOSSARY.md`.

## D2. Blank vazio e fill-in pendente (lote D)

Achados F5, F11, F23. Decidido em 2026-10-20.

- Chave ausente ou `null` é blank vazio (nota 0 em toda estratégia).
- `{}` é uma resposta com todos os blanks vazios: nota 0, a questão não é pulada (só `null` pula).
- Valor de tipo errado para o blank é malformado, pela regra do tipo do blank (`ResponseError`).
- Fill-in pendente: o instrutor pontua cada blank pendente em [0, 1]; a estratégia combina as notas dos blanks.
- Novo corpus `examples/grading/fill-in.yaml`: linhas da tabela de exemplo, blanks vazios, `{}`, blank pendente, ordem do feedback.

## D3. Estratégia do choice blank (lote D)

Achados F4, F22. Decidido em 2026-10-20.

- `partial`, `no-mistakes` e `all-or-nothing` pontuam o choice blank com o `partial` do multiple choice; `symmetric` com o `symmetric`. Mesma tabela de `docs/exam.md`.
- A tabela de exemplo diz que a coluna "blank scores" mostra os valores sob `symmetric`.

## D4. Short answer blank exige o bloco accept (lote D)

Achados F17, F18. Decidido em 2026-10-20.

- Todo short answer blank MUST ter `[^id/short-answer]` (pode ser vazio), como a questão short-answer. Só reject é erro (mesmo código da questão).
- Linhas 314-315: sem padrões accept, `unmatched` tem default `manual`, e o instrutor avalia o que nenhum padrão reject decide.

## D6b/D6c. Referência repetida e parse errors das definições (lote E)

Achados F6, F7. Decidido em 2026-10-20.

- Cada id aparece no máximo uma vez no stem; repetir é `duplicate-blank-reference` (error, código novo).
- Linha `parse-error` na tabela, com regra MUST no texto, para: linha em branco antes da lista de choices; texto na linha da tag de choice (`[^capital]: Brasília`, mensagem sugere `/short-answer`); sufixo de tipo desconhecido; unidade em tag não numérica; segunda definição de um id (qualquer tipo); item de lista logo depois do conteúdo de short answer.

## D7. Convenção das gramáticas de lista (lote E)

Achados F37, F38, F39. Decidido em 2026-10-20.

- `pattern_item` perde `ws? LIST_MARK ws`: a gramática do item vale depois do marcador (`docs/references/grammar.md:73-75`), como `item` das choices.
- O `value` do numeric passa a se chamar `numeric_value`.
- Trocar o caractere do bullet inicia outra lista, como no CommonMark.

## D9. Blocos mínimos de short answer (lote F; reverte D4)

Achados F17, F18. Decidido em 2026-10-20.

- A questão short-answer e o short answer blank precisam de pelo menos um bloco: `[short-answer]` (ou `[short-answer/accept]`) ou `[short-answer/reject]`. O texto de `docs/question-types/short-answer.md:140` dizia "MUST have a `[short-answer]` block", o que era ambíguo.
- Só reject é válido: sem `accept`, `unmatched` tem default `manual`, e o instrutor avalia o que nenhum padrão reject decide.
- Reverte D4: o blank só com reject volta a ser válido (o exemplo `examples/invalid/fill-in-reject-without-accept` vira válido).

## D6a. Definições contíguas (lote F)

Achado F3. Decidido em 2026-10-20.

- As definições de blank formam uma sequência contínua de blocos, separados só por linhas em branco. O primeiro bloco de outro tipo inicia o epílogo.
- Uma linha de tag de definição de blank no epílogo é `detached-blank-definition` (error, código novo), com mensagem que manda mover o parágrafo para depois das definições. Mesmo modelo de `detached-answer-list`.

## D8. Linhas lazy e literal exato (lote G)

Achados F40, F41, F42. Decidido em 2026-10-20.

- D8.1: um sublinhado setext (`=+` ou `-+`, com espaço opcional no fim) logo depois do conteúdo de uma definição é `parse-error` (a linha transformaria a tag num heading).
- D8.2: a regra normativa é a continuação de parágrafo do CommonMark; `LAZY_START` é uma aproximação (como o schema no D12). Só se corrige o regex para `>`/`!` com 4+ colunas de indentação, que é continuação.
- D8.3: o literal exato não pode abrir no fim da linha: a sequência de crases de abertura precisa de texto na mesma linha. Por simetria, a de fechamento também não pode abrir uma linha. Motivo: as quebras de linha só existem para word wrap; aceitar abrir/fechar na quebra obrigaria a definir se o espaço da ponta é removido.
