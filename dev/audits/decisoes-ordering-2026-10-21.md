---
type: decision-log
status: closed
tags: [auditoria-spec, ordering]
relatedTo: [dev/audits/spec-ordering-2026-10-21/, docs/question-types/ordering.md, docs/responses.md, schema/ordering.yaml]
---

# Decisões da auditoria de ordering (2026-10-21)

Relatório: `dev/audits/spec-ordering-2026-10-21/report.pdf` (26 achados: 3 high, 10 medium, 13 low; 6 issues e a
mecânica com F1, F17, F29, F30, F33).

## I1. Relações entre answer key, extra, accept e reject

Achados F6, F19, F11, F27, F15.
Decidido em 2026-10-21.

- D1 (F6): reject igual ao `[ordering]` depois de toda a normalização é erro; `accept-reject-overlap` passa a cobrir key × reject.
- D2 (F19): as linhas de um `## [accept]` precisam ser um sub-multiconjunto das linhas do `[ordering]` depois da normalização (pode omitir linhas, não pode trazer distrator nem linha estranha). Erro, código novo `accept-outside-answer-key`.
- D3 (F11): um `## [reject]` que usa linha (ou mais cópias) que o pool `[ordering]` + `## [extra]` não oferece gera warning `unreachable-alternative`.
- D4 (F27): só prosa: distratores são comparados depois da normalização; um distrator que vira cópia de uma linha do key é uma cópia extra (MAY da linha 196).
- F15 (sem pergunta): `accept-repeats-answer-key` ganha frase na prosa e a footnote [^9] na tabela.
- Pedido do humano: o spec não tem exemplo com a notação de lista (`ul`); adicionar um exemplo completo com lista na seção Example, para não parecer que só o bloco de código vale.

## I2. Respostas, casamento e feedback

Achados F9, F14, F28. Decidido em 2026-10-21.

- D5 (F9): `ResponseError` quando a resposta tem linha fora do pool (`[ordering]` + `## [extra]`), usa mais cópias de uma linha do que o pool oferece, ou, com `indentation: fixed`, traz nível diferente do autoral. Omitir linhas é válido (estilo Parsons) e vai para o grading normal.
- D6 (F14): quando várias respostas declaradas casam, vale a primeira em ordem de documento (`[ordering]` primeiro, depois as seções na ordem em que aparecem); só o feedback dela é mostrado.
- D7 (F28): "Repeated lines are compared in the order they appear" sai; casar = sequências iguais depois da normalização.

## I3. Gramática

Achados F2, F3, F4, F5, F12. Decidido em 2026-10-21.

- D8 (F2, F3): seguir short-answer e fill-in: `ws? "[" "ordering" "]" ws? nl content`, e o bloco começa na linha logo após a tag, sem linha em branco. Linha em branco entre tag e bloco é `parse-error` (o mdq-py hoje aceita: muda). Padrão: short-answer.md:208-212 (lista solta vira epílogo, warning `detached-answer-list`) e fill-in.md:249 (`parse-error`); ordering não tem como deixar o bloco solto, então `parse-error`, como fill-in.
- D9 (F4): headings das seções seguem CommonMark, como essay: indentação até 3, espaços no fim, sequência de fechamento e setext (com lint `setext-heading`). A regra fica uma vez em `question-base.md` para toda seção `## [name]`. Exemplos no corpus para cada variante.
- D10 (F12): seção vazia (`## [extra]` sem bloco, idem accept/reject) é `parse-error` com mensagem própria, linha na tabela.
- D11 (F5): uma frase depois do snippet dizendo que "mesmo tipo de bloco" e "no máximo um extra" são checadas depois do parse.
- F1 (mecânico, junto): `(blank_line* section)*` para aceitar linha em branco antes das seções.

## I4. Texto e indentação das linhas

Achados F7, F16, F10. Decidido em 2026-10-21.

- D12 (F7): item de `ul` aninhado é uma linha própria; o nível é a profundidade de aninhamento (0, 1, 2...), sem unidade nem MDC. O spec ganha um exemplo com lista aninhada.
- D13 (F16): espaços no fim da linha são removidos; linha só com espaços é linha em branco (nível 0, texto vazio).
- D14 (F16): tab segue a tab stop do CommonMark (próxima coluna múltipla de 4): `  \t` = 4 colunas.
- D15 (F10): com `fixed` as linhas aparecem no nível autoral; com `lenient` e `strict`, todas no nível 0.

## I5. `content` e `highlight`

Achados F8, F24, F32. Decidido em 2026-10-21 (substitui as propostas D16/D17).

- Proposta do humano: `content` e `highlight` saem do frontmatter do ordering; o valor vem sempre do body. Frontmatter com eles vira `unknown-frontmatter-key` (quebra; changelog). Essay mantém os campos (lá descrevem o editor do aluno).
- D18: o fence de `## [extra]`/`## [accept]`/`## [reject]` usa a mesma linguagem do `[ordering]` ou nenhuma (herda); linguagem diferente é `parse-error`. `extra-other-highlight` vira inválido.
- D19: no YAML/JSON `content` é obrigatório; `highlight` é opcional e só com `content: code` (if/then no schema). Fence sem linguagem segue válido.

## I6 e mecânicos (sem pergunta)

- F31: frase na prosa para cada regra só da tabela. F34: exemplo de exame com seções de ordering e epílogo.
- F17 (termo "answer key"), F30 (linha `unmatched` na tabela), F33 (`highlight` vazio na tabela; revisar depois de I5).

## I4b. Níveis em `ul` (consequências do D12)

Decidido em 2026-10-21.

- D20: com `content: text`, em `[ordering]`, `## [accept]`, `## [reject]` e na resposta, a primeira linha tem nível 0 e cada linha sobe no máximo 1 em relação à anterior. Modelo YAML fora disso é erro; resposta fora disso é `ResponseError`. `## [extra]` fica de fora (pool de linhas soltas).
- D21: item de `ul` cujo único conteúdo é uma sub-lista não é linha; só aumenta a profundidade (`- - Bahia` = `[1, "Bahia"]`, como o CommonMark lê). Útil para distratores aninhados no `## [extra]`. Corrige B2: o mdq-py lia `- - Bahia` como `[1, "- Bahia"]`.
- D22: code span com espaços iniciais como indentação em `ul`: não agora; vai para o BACKLOG. Quem precisa de indentação livre usa fenced block. O humano não achou questões boas com raiz aninhada; árvores cobrem os casos naturais.

## Decisões tomadas na implementação

- Códigos novos: `accept-outside-answer-key` (erro), `unreachable-alternative` (warning), `invalid-outline-level` (erro de modelo). `accept-reject-overlap` cobre reject × `[ordering]` com path `["reject", i]`.
- D5: o pool usa (nível, texto) com `fixed` e só texto com `lenient`/`strict`; checa as linhas como enviadas. Cópia a mais ou linha fora do pool, que antes davam score 0, agora são `ResponseError`.
- I3: seção vazia dá "the ## [extra] section has no content block"; `setext-heading` aponta para a seção (`answerKey`, `extra`, `accept`/`reject`); a mensagem de `---` no exame diz "epilogue or section" (OR13: o mdq-js compara o texto antigo). Heading indentado 2+ colunas depois de um `ul` vira filho do último item (CommonMark).
- I5: `content`/`highlight` no frontmatter do ordering dão `invalid-frontmatter-field`. Termo novo "declared answers" (answer key + rejects) em ordering.md; entrada "Declared answer" no GLOSSARY.md.
- I4b: sub-lista ordenada na linha do marcador (`- 1. x`) é `parse-error`; o render escreve `* * x` para linha de `ul` sem pai.
- Arquivo de auditoria arquivado em `dev/audits/spec-ordering-2026-10-21/`.
