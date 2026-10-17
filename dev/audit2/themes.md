## Método

- Leitura integral de `docs/` (16 arquivos, 3.8k linhas) e `schema/*.yaml` por mim, com notas em `notes.md`.
- Oito auditores independentes, um por área, com o mesmo briefing (`brief.md`): conformidade de cada exemplo (`.mdq.md` -> `.yaml` -> `.lint.json`), exaustividade (campos, enums, alternativas da gramática, regras, lint codes, formas de invalidar, grading) e defeitos de spec. Os auditores não leram implementação nem auditoria anterior.
- Cada área recomputou à mão o que dava para recomputar: as tabelas de grading dos docs (MC simétrico, MS, TF, fill-in: todas corretas), domínio e `decimalPlaces` de todos os numéricos, unidade de indentação de todos os ordering, durações/starts canônicos e as 7 resoluções de include. **Nenhuma divergência numérica.** Os problemas são de texto normativo, de código de diagnóstico e de cobertura.

## Veredito curto

- O spec não tem contradições numéricas nem de grading. Tem contradições de **texto** (mesma regra em dois níveis, dois códigos para um defeito, prosa vs gramática vs schema) e **lacunas** onde o corpus decide sozinho.
- 28 achados `high`. Agrupados, são 9 temas. A maioria se resolve com 1 a 3 frases no doc certo; três exigem decisão de design (T2, T4, T9).
- O corpus de grading é o ponto mais fraco: faltam essay, fill-in, ordering e exame; nenhum arquivo cobre `null` (skip), resposta malformada ou feedback; a convenção de pendente é `"pending"` (string), não `score: null`.

## Temas transversais (ordem sugerida de ataque)

### T1 `minLength: 1` prometido na prosa, ausente no schema (high)

- Onde: SB-S7, SB-C1, CHO-S1, TFE-S1, FILLIN-C2, SA-S9.
- base.md: "every text field (`title`, `author`, `comment`, choice text, feedback and the like) MUST NOT be the empty string (`minLength: 1`)". Schema: `comment`, `preamble`, `epilogue`, `answerKey`, `incorrectFeedback`, `instructions`, `feedback`/`comment` de choice e de pattern **não** têm `minLength`; `Alternative.feedback` de ordering tem. `valid/essay/blank-comment.yaml` pina `comment: ''` como válido com warning, contra o base.md.
- Decisão: ou o schema segue a prosa (adiciona `minLength` e `blank-comment` vira inválido; comment string só de `#` vira "sem comment"), ou a prosa lista exatamente os campos com `minLength`. Recomendo a primeira: é o que o base.md já diz, e `blank-text-field` fica só para espaço em branco.

### T2 Chaves de frontmatter: "as-is" vs "dropped", sem lista normativa (high)

- Onde: SB-S3, SB-S4, SB-S5, TFE-S2, BASE-C3, EXAM-S10..S12, TFE-E8, SB-E8.
- base.md diz que todo campo do frontmatter vai "as-is" para o AST; lint-codes diz que chave desconhecida é "dropped" com `unknown-frontmatter-key`; o schema rejeita chave desconhecida (`unevaluatedProperties: false`). O corpus segue "dropped" em Markdown e `schema-error` em YAML. Nenhum doc lista as chaves reconhecidas por tipo; campos derivados do corpo (`stem`, `answer`, `choices`, `answerKey`, `lines`, `blanks`) no frontmatter têm só a frase genérica "frontmatter takes precedence", que short-answer contradiz com `conflicting-accept`. O comment string não tem nome de campo no spec (só o corpus diz `comment`); exame não tem `comment` no schema. `automation:` no frontmatter: "MUST NOT appear" vs dropped-com-warning.
- Decisão: uma tabela de chaves reconhecidas por tipo (frontmatter e AST), a regra de drop como terceira exceção do base.md (só Markdown), a lista explícita do que pode colidir e vencer, e `comment` nomeado (inclusive em exame).

### T3 Grading: corpus incompleto e convenção de pendente (high)

- Onde: NUM-E1..E6, SA-E1..E3, CHO-E1..E3, TFE-E2, TFE-E7, FILLIN-E1, ORDERING-E1, EXAM-E1.
- Faltam `grading/essay.yaml`, `fill-in.yaml`, `ordering.yaml` e `exam.yaml` (média ponderada, peso 0, penalty none/capped/full, pendente + provisional, chave desconhecida, include não resolvido). Em todos os 5 existentes faltam `response: null` (skip), resposta malformada (id desconhecido, tipo errado) e qualquer expectativa de feedback. O MS usa `ticks: []` e não consegue expressar `null` vs `{}`.
- Convenção: short-answer.yaml usa `score: "pending"` e numeric.yaml `"malformed"`; o pedido era `score: null`. Escolher uma e documentar no cabeçalho de cada arquivo (sugiro manter `"pending"`/`"malformed"` como strings: `null` já significa skip nas respostas).
- Os auditores deixaram esboços prontos em cada arquivo de findings (fill-in e exame com valores já calculados).

### T4 Numérico: aritmética, representação e inferência fora do Markdown (high)

- Onde: NUM-C1..C4, NUM-S1..S4, R1, N4, FILLIN-S5, FILLIN-C9.
- `grading/numeric.yaml` pina resultados que só saem com aritmética decimal exata na comparação de tolerância; o spec só exige decimal no arredondamento. Representação: "MAY converter 0.25 para float", "SHOULD inteiro" mas o corpus pina uma escolha. Inferência de `domain`/`decimalPlaces` só é definida a partir do corpo Markdown; YAML sem os campos fica sem precisão definida (e fill-in nem menciona a inferência). responses.md se contradiz: unidade incompatível é "grade zero" e "malformed" na mesma seção. "`domain: integer` + `3.0`": lint lê valor, responses lê forma. `1/0` em Markdown: gramática aceita, corpus pina `parse-error`. Tolerância absoluta inteira sai como `1.0` em alguns `.yaml` e `1` em outros.
- Decisão: comparação em aritmética exata (racional) por MUST; inferência a partir de valores para documentos YAML; unidade incompatível = malformed; uma só representação da tolerância.

### T5 Short answer: contra o que o regex casa; `\s` no schema (high)

- Onde: SA-S6, SA-S7, SA-S5, SB-S10, SA-C1, SA-S1.
- responses.md: "Short answers are normalised before matching -- case folded, unicode normalised, whitespace collapsed" contradiz regex (case-sensitive por padrão) e literal exato. patterns.md não diz se o regex vê a resposta crua, NFC ou aparada. Âncora implícita com alternação (`/a|b/` -> `^a|b$` ou `^(?:a|b)$`?) e semântica de `i` sem `u` não definidas. `patternString` no schema usa `\s` e `$` (Python aceita `\n` final), contra o próprio grammar.md. `conflicting-accept` tem forma qualificada ("block with content") e não qualificada; só a qualificada funciona. `partial-backtick` pinado como `schema-error` onde a gramática dá `parse-error`.

### T6 Inferência de tipo e escolha do corpo (medium/high)

- Onde: CHO-S2, CHO-S3, CHO-C2, CHO-C3, TFE-S5, SB-C3, BASE-C2.
- O conjunto de "values" para inferência não é definido: `[]` é `parse-error`, `[?]`/`[essay]`/`[✓]` são `foreign-choice-marker`, sem frase que separe. Duas listas candidatas: nenhuma regra diz qual é o corpo. Tipo forçado sem corpo compatível: `schema-error` num exemplo, `parse-error` em outro.

### T7 Gramática de feedback/comentário vs corpus (high)

- Onde: CHO-S4, CHO-S7, CHO-C4, TFE-S6, ORDERING-C1, ORDERING-S1, ORDERING-C2.
- MS e TF declaram `item : ... markdown+` sem `>`/`!`, mas o corpus pina feedback/comment ("follow the same structure" não é gramática). Ordering: a gramática das observações não permite linha em branco entre `>` e `!`, mas dois exemplos válidos têm; a frase "once a `!` comment block has started, a `>` line ends the observations" contradiz "either order", a gramática e o próprio exemplo do doc. Junção de linhas de feedback com espaço é pinada sem regra. Lazy continuation de blockquote vs linha `!` não definida.
- Decisão: um único `item` compartilhado (MC) com `value` por tipo; observações lidas linha a linha; `nl*` entre blocos.

### T8 Exame: `---`, classificação de bloco, H1, formas canônicas (high)

- Onde: EXAM-S1..S5, EXAM-C2, C3, C6, C7, EXAM-S2, SB-S10.
- `---` no epílogo: a tabela diz critical e warning ao mesmo tempo, sem código; o corpus pina `parse-error`. Nenhuma regra diz o que torna um bloco `---` um include (vs frontmatter de questão): `max` sozinho tem três leituras. Não há gramática do H1 (`# [slug]` sem texto, slug inválido, H1 ausente). Forma canônica de `start` (`Z` -> `+00:00`, segundos) só existe no corpus. Prosa permite `90m` e espaço em `start`, schema não: documento YAML fica indefinido. `include-all.resolved.yaml` pina uma ordem que o spec chama de implementation-defined.

### T9 Fill-in: resposta e posição do blank (high)

- Onde: FILLIN-S1..S4, FILLIN-C1, C4, C5, C6.
- "Blank vazio" não definido (chave ausente, `null`, `""`); vazio sob `unmatched: manual` é 0 ou pendente; chave desconhecida malformed ou ignorada. Blank em heading/lista/tabela/blockquote: "reject OR leave as text", sem código para reject, e contradiz "preamble/epilogue é literal". Code span: "inside code is literal" vs "rules out inline code". Definição duplicada pinada como `parse-error` onde a única regra dá `duplicate-blank-id`. Tipo de blank desconhecido sem regra.

### T10 Regras sem código, códigos sem regra, severidade dupla (medium)

- Onde: SA-S2, SA-S3, ORDERING-S2, ORDERING-S10, CHO-S9, CHO-S10, L1, SB-S8, SB-S18, N3.
- Sem código: `incorrectFeedback` em branco, feedback/comment de pattern, `description`/`instructions` em branco, `reject` igual ao answer key de ordering (fica com score 1 e 0 ao mesmo tempo), accept que usa distrator, "[150%] makes the question malformed". Sem regra: `multiple-choice-many-correct-choices`. Severidade dupla: `blank-text-field` warning e error (justificativa fraca no próprio doc); `domain: integer` + `0.75` dispara `answer-outside-domain` (warning) e `domain-mismatch` (info). Linhas "critical" que só a gramática pode violar não dizem `parse-error`.

### T11 Ids e tags (medium)

- Onde: SB-S11, SB-S12, SB-C2, BASE-C1, BASE-S1, EXAM-S13.
- Id de questão: SHOULD slug (warning). Id de choice/blank: pattern no schema (erro) sem frase na prosa, e bloqueia o "MAY widen under a flag". Tags: split por vírgula descarta partes vazias sem regra; unicidade só no schema; `include` nunca é definido como slug.

### T12 Convenções de diagnóstico (medium)

- Onde: SB-S16, SB-S17, EXAM-C4, EXAM-C5, TFE-C2, ORDERING-C4, FILLIN-C10, SA-C2.
- Path de `schema-error` (chave ausente/desconhecida: no pai ou na chave?), um diagnóstico por campo ou por ocorrência (`setext-heading`, `foreign-choice-marker`), se warnings acompanham um erro no `.lint.json`, paths divergentes entre códigos irmãos (`["accept",0]` vs `["accept",0,"lines"]`). Nada disso está escrito; o corpus decide caso a caso.

### T13 Higiene do corpus (low)

- Comentários citam `dev/specs/...`, `mdq.models._base`, `_split_exam_blocks`, `with_ids()`, linhas de doc que mudaram, seções que não existem ("Scheduling", "Questions"). Nomes enganosos (`exam-two-h1`, `*-provisional`). `matching/*.yaml` diz que escapa invisíveis mas não escapa (U+2028 cru quebra em YAML 1.1). Comentários errados (`redundant-regex-anchor-cases`, `literal-asterisk` fala em wildcard, `numeric-blank-forms` "beyond 32 bits").

### T14 Miúdos de doc e schema (low)

- `schema/ordering.yaml` repete `uniqueItems` (viola a própria regra de chave repetida; js-yaml estrito rejeita). "seven question types" no bundle e no base schema (são oito). essay.md define `[^2]` duas vezes. true-false: `id` não está na tabela de locale mas tem regra; `marker` description fala "PROVISIONAL"/"answer". `shuffle: boolean` nas tabelas vs `boolean | "inherit"` na nota. `percent` aceita zeros à esquerda contra INTEGER/DECIMAL. `##[accept]` com `ws?` não é heading em CommonMark. Âncora `#questions` quebrada em três docs. `unmatched` default difere entre ordering (`manual`) e short-answer (`incorrect` com accept) sem justificativa. uuid Nil/Max tratados como não-padrão contra RFC 9562. `locale-lookalike-language` sem conjunto definido.

## O que o spec já justifica (não é defeito)

- `blank-text-field` com duas severidades: documentado com plano B (`blank-intro-field`). Fraco, mas consciente (T10).
- `include-all` com ordem/subconjunto implementation-defined: justificado; o problema é só o fixture (EXAM-C1).
- `S` = TRUE apesar do indonésio: justificado em true-false.md; o que falta é a frase da tabela de locale (TFE-S3).
- Regex como subconjunto de JS e dialeto explícito da gramática: justificados em grammar.md/patterns.md; o schema é que não segue (T5).
