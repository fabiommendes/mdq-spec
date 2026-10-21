---
type: decision-log
status: closed
tags: [auditoria-spec, essay]
relatedTo: [dev/audits/spec-essay-2026-10-21/, docs/question-types/essay.md, docs/question-types/ordering.md, docs/responses.md]
---

# Decisões da auditoria de essay (2026-10-21)

Relatório: `dev/audits/spec-essay-2026-10-21/report.pdf` (18 achados, 6 issues contando a
mecânica).

## Lote M (mecânico)

Achados F1, F11, F20, F28, F29:

- F1: `essay : ws? "[essay]" ws?`, como numeric e short-answer.
- F11: regras de nível warning escritas com "should" (essay.md e ordering.md:339); a nota 1 diz que `highlight` SHOULD ser omitido fora de `code`.
- F20: a linha 55 diz que toda resposta de essay é corrigida pelo instrutor.
- F28: a descrição de `highlight` no schema perde "and, where supported, validation".
- F29: o texto diz que `highlight` vazio é `schema-error` (`minLength: 1`).

## D1. Parágrafo da tag e seção `## [answer-key]` (lote A)

Achados F2, F3, F4, F7, F8, F26. Decidido em 2026-10-21.

- O corpo é um parágrafo cujo único conteúdo é `[essay]`, com `ws?` em volta, em minúsculas. Item de lista ou heading não é a tag. Um segundo parágrafo `[essay]` é elemento proibido do epílogo. Erros de parse vão para a tabela.
- A seção começa num H2 `## [answer-key]` sozinho na linha. O H2 setext (`[answer-key]` + `---`) também vale, porque o CommonMark lê os dois como H2.
- A seção vai até o fim da questão (fim do arquivo, ou o próximo bloco num exame) e aceita qualquer bloco, headings inclusive, exceto H1.
- O conteúdo, sem o heading, é o campo `answerKey`, com a mesma licença de normalização de `stem` e `epilogue`. Gramática nova `answer_key` ao lado de `essay`.
- Segunda seção: `parse-error`. Seção vazia: answer key ausente, só `missing-answer-key` (como o corpus já decide).
- Nome de tag de tipo pode ser slug (`[essay] Texto...` no primeiro parágrafo é o slug `essay`); um parágrafo só com `[essay]` é sempre a tag.
- Footnote: a definição pertence ao campo em que está (stem, epílogo, answer key). Uma referência sem definição no mesmo campo é texto, como no CommonMark.

## D2. Resposta de essay (lote A)

Achado F5. Decidido em 2026-10-21.

- O formato da resposta com `content: text` depende do host (Markdown, HTML...). O spec não fixa.
- Com `plain` e `code`, a resposta é sempre o texto verbatim.

## D3. Posição das seções `## [name]` (lote B)

Achados F21, F25. Decidido em 2026-10-21.

- Seções específicas do tipo vêm depois do epílogo, como diz `question-base.md:4-6` e `264-265`. Essay fica como está.
- Ordering muda: `## [extra]`, `## [accept]` e `## [reject]` passam a vir depois do epílogo.
- As regras de `---` e setext do exame (`docs/exam.md:161-165`) valem para todo bloco depois do corpo, answer key e seções de ordering inclusive.

## D4. `input` vira `content` (lote A)

Achado F22. Decidido em 2026-10-21.

- O campo `input` do essay passa a se chamar `content`, o nome do ordering. Os valores continuam por tipo: essay `code`/`text`/`plain`, ordering `code`/`text`.
- Quebra documentos com `input:`; vai para os changelogs e para o port do mdq-js.
- O código de lint `code-input-without-highlight` vira `code-content-without-highlight`.

## Recomendações aceitas sem pergunta (lote A)

Achados F9, F12, F13.

- essay.md ganha seções Grading, Automation e Response: automation `manual`, toda resposta é pending até o instrutor dar nota em [0, 1], o `grading` do exame não se aplica e `penalty` se aplica.
- A answer key MUST NOT ser mostrada antes do envio da resposta; MAY depois, mesmo com a resposta pending.
- MDQ não tem campos de limite de tamanho nem anexos: limites vão no stem ou em `meta`.

## Decisões tomadas na implementação

- `content` entrou em `POLYMORPHIC_PROPERTIES` de `scripts/spec_audit.py` (valores diferentes no essay e no ordering).
- `mdq.types.EssayInput` virou `EssayContent`.
- No answer key só H1 é proibido (`forbidden-block-element` em `answerKey`); parágrafo ou heading que começa com `[` é aceito.
- Ordering: prosa entre duas seções, ou depois da última, é `parse-error`. `examples/invalid/ordering-epilogue-before-section` virou válido e saiu do corpus.
- Pendente para o port/ordering: a mensagem de `---` no exame ainda diz "epilogue" quando o `---` está no answer key, e `setext-heading` de um `[answer-key]` setext usa o path `epilogue`.
