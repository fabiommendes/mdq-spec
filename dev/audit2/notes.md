---
type: plan
status: active
tags: [mdq, audit, spec]
relatedTo: []
---

# Auditoria 2 do spec: notas de leitura (Fable)

Fontes permitidas: docs/, examples/, schema/. Nada de dev/audit, handoffs ou implementações.

## base.md
- B3 OPTIONAL+NULLABLE: "null em OPTIONAL = ausente" vs "NULLABLE deve aparecer com null". Quais campos são NULLABLE? conferir schema.
- B4 id: frontmatter footnote 2 "SHOULD url-safe" (warning na tabela) vs Slug section "MUST match SLUG". Conferir se schema tem pattern em id (se tiver, contradiz warning).
- B5 stem/preamble/epilogue em branco = critical; title/author/comment em branco = warning (blank-text-field). Conferir lint-codes.
- B6 forbidden: "paragraph starting with [ except the first paragraph" ambíguo no epílogo.
- B9 automation MUST NOT be a field: há código de lint/erro? (unknown-frontmatter-key?)
## grammar.md
- ok até agora.
## patterns.md
- P4 flags u/v ignorados: semântica de `.` e classes com astral chars (code unit vs code point) não definida. baixo.
- P5 pattern "cannot be empty": e só espaços? (blank-text-field?) conferir lint-codes.
- P8 item de pattern list: "blank line inside the item is ignored" mas não diz que continuação precisa de indentação; como termina o item vs epílogo? single-line form termina na 1a linha em branco (assimetria). conferir short-answer.md.
## multiple-choice.md / multiple-selection.md
- MC1/MS1 gramática do item: MC `md_inline+ nl extra_lines? (feedback? comments? | comments feedback)`; MS `markdown+` (blocos aninhados) sem feedback/comment, mas "Choices follow the same structure". Qual é normativa? Itens com bloco aninhado (parágrafo 2, code block) são válidos?
- MC2 `percent: /[+-]?[0-9]+([.][0-9]+)?%/` aceita zeros à esquerda e `+`; grammar.md INTEGER/DECIMAL proíbem. `[150%]` "malformed": qual código? (schema-error por min/max?)
- MC9 `[]` vazio: não casa `value` (ws exige 1+). É foreign-choice-marker, lista não-choice, ou texto? Lacuna.
- MS2 tabela diz `shuffle: boolean`, footnote diz `boolean | "inherit"`. Tipo na tabela errado (MC e MS).
- MS3 "skipped question shows no feedback" vs "absence of markings always implies false": como distinguir skipped de tudo-desmarcado? conferir responses.md.
## true-false.md
- TF4 tabela de locale só en/pt/es e "subtag fora da tabela não tem expectativa", mas parágrafo seguinte pede warning dedicado para `S` sob `id`. `id` deveria estar na tabela (ou a regra ser exceção explícita).
- TF5 "skipped question" vs "all statements abstained": depende de responses.md distinguir.
## numeric.md
- N3 `domain: integer` + answer 0.75: regra "answer warning must be whole" E regra "domain info not narrower" cobrem a mesma situação em níveis diferentes. Qual código? conferir lint-codes.
- N4 decimalPlaces inferido: "parsed document carries the inferred value" só cobre Markdown. Documento YAML sem decimalPlaces e domain decimal: inferir no load? Comparar com que precisão? Lacuna.
- N5 resposta a pergunta de domain fraction: formato da resposta (string "1/3"? número?) -> responses.md.
## essay.md
- E2 conteúdo permitido no answer-key (H1? blocos proibidos?) não definido. baixo.
- E3 footnote `[^2]` definida duas vezes (default "text" e Pygments). Bug de doc.
- E4 quais campos do AST podem ir no frontmatter (answerKey, answer, tolerance, choices?). base.md diz "frontmatter takes precedence" em colisão, sugerindo que sim. Conferir unknown-frontmatter-key em lint-codes e schema.
## short-answer.md
- SA3 conflicting-accept: prosa diz "block *with content* + frontmatter accept"; tabela diz "block and field" sem qualificador. `[short-answer]:` vazio + `accept:` no frontmatter é válido?
- SA4 EXACT_TEXT exclui crase: literal exato com crase impossível; texto após crase de fechamento (`` `foo` bar ``) sem código definido.
- SA5 continuação de conteúdo single-line: "linhas até a 1a em branco continuam o pattern", mas linha `* x` logo após é erro. Gramática não expressa continuação.
- SA12 feedback/comment em preAccept/preReject (object form): quando é mostrado? não definido.
## ordering.md
- O1 default de `unmatched`: ordering = "manual"; short-answer = "incorrect" quando há accept. Ordering sempre tem answer key, então pela lógica do SA deveria ser "incorrect". Escolha não justificada no doc.
- O3 observations: gramática e exemplo permitem `!` antes de `>`; prosa "once a `!` comment block has started, a `>` line ends the observations" contradiz.
- O7 conteúdo `ul`: de onde vem o nível de indentação de um item (antes do marcador? depois?). Item indentado em markdown vira lista aninhada. Não definido.
- O11 `reject` igual ao bloco `[ordering]` (ou a um `accept`): só accept-reject-overlap cobre accept×reject; reject×answer-key sem código (deveria ser erro).
## fill-in.md
- F10 blank numérico: `domain`/`decimalPlaces` não têm sintaxe Markdown (só inferência); em YAML podem ser declarados? conferir schema.
## exam.md
- X4 duplicate-question-id considera ids derivados (posição), mas posições só se conhecem após resolver include-all. lint-codes diz que erros impedem o load. Quando a regra roda num exame com include-all? Não definido.
- X11 `---` como thematic break no epílogo dentro de exame: tabela diz critical; prosa diz SHOULD warn (unsafe-thematic-break, warning, "any"). Qual código no caso crítico (parse-error? yaml-syntax-error?). Preâmbulo de questão inline: `---` isolado é thematic break ou início de bloco? Só "after the body" está definido.
- X16 "exam title is a required H1" vs "all properties optional" + `# [slug]` sem texto (blank-title). title é obrigatório no schema? exame YAML sem title é válido? missing-title aplica a exam?
- X9 herança locale/author: "parsed document carries" só para Markdown; exame YAML sem o campo na questão: herda no load? (igual N4).
## responses.md
- R1 domain integer + response `3.0` ou `"6/2"`: malformed ("a decimal where domain is integer") ou valor 3? Lint usa valor; responses usa forma. Inconsistente.
- R2 unidade incompatível: "reject with grade zero" (score) vs "malformed response, never a wrong answer" (erro). Contradição direta no mesmo doc.
- R3 `UnresolvedInclude` (include) vs `unresolved-include-all` (lint-codes). Nome/escopo divergem.
- R8 blank vazio em fill-in: chave ausente, null ou ""? Para short-answer blank, "" pode casar `/.*/`. Não definido.
- R4 (resolve MS3/TF5): null vs {} distingue skipped de abstido. OK.
## lint-codes.md
- L1 blank-text-field com duas severidades (warning em title..., error em stem...). Fragilidade documentada, justificativa fraca ("if that turns out to be a problem").
- L2 multiple-choice-many-correct-choices não tem regra correspondente na tabela de multiple-choice.md (texto diz que MAY warn só para "every choice correct").
- L4/E4 unknown-frontmatter-key "dropped" vs base.md "all fields translated as-is". Não há lista normativa de chaves reconhecidas por tipo (answer, choices, answerKey, comment no frontmatter?).
- L5a sem código: incorrectFeedback em branco (regra warning em SA), feedback/comment de pattern em branco (object form), description/instructions em branco, pattern só espaços.
- L8 missing-title "any" inclui exam, mas exam exige H1.
- L9 stem-not-a-paragraph "any" inclui exam (sem stem).
- N3 confirmado: domain integer + 0.75 dispara answer-outside-domain (warning) E domain-mismatch (info). Dois códigos para um defeito.
- B10 comment string: nome do campo AST (`comment`) só aparece na tabela de regras; `comment:` explícito no YAML é reconhecido?
## schema/*.yaml (leitura própria)
- S1 choice id / blank id têm `pattern` SLUG no schema (erro); question id só minLength (unsafe-id warning). Tratamento desigual não documentado; e o schema impede "MAY widen under a flag" para choice ids.
- S6 true-false marker description fala "PROVISIONAL letters" e "`answer` carries the meaning": termos obsoletos (doc diz WARNING; campo é `correct`).
- S8 numeric answer pattern já rejeita denominador zero (schema-error) mas lint-codes diz malformed-numeric-answer cobre "fraction with nonzero denominator". Qual código? conferir exemplo numeric-zero-denominator.
- S11 patternString pattern usa `\s` em JSON Schema; grammar.md "Regex dialect" diz que o spec usa só classes explícitas. Também define que `` `a` b `` é schema-error (resolve SA4).
- S13 ordering Alternative feedback/comment minLength 1; Choice feedback/comment sem minLength. Desigual.
- S15 exam.start pattern exige `T`; prosa permite espaço no Markdown. Para YAML-authored: normalização acontece? (família N4/X9: nada diz que load normaliza YAML).
- S16 duration pattern aceita `P1W2D` e `PT0S` (invalid-duration no modelo). ok.
- S19 exam.description/course minLength 1 (vazio=schema-error; só espaços=sem código).
- S23 numeric decimalPlaces inferido deve estar nos .yaml de decimal (agente numeric confere).
- F10 confirmado: NumericBlank aceita domain/decimalPlaces em YAML; sem sintaxe Markdown.
