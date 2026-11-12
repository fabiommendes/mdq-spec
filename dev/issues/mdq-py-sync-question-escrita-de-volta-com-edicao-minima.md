---
type: issue
status: completed
tags: [mdq-py, sync, api]
kind: enhancement
created: 2026-11-12
creator: claude
closed: 2026-11-12
---

# mdq-py: sync_question, escrita de volta com edição mínima

## Contexto

A CLI do Codehood vai fazer sync bidirecional (RFC
`codehood/dev/rfc/sync-bidirecional.md`, seção "Escrita de volta: writers").
O servidor guarda só o documento mdq em JSON, nunca o markdown. Para aplicar
no arquivo local uma questão alterada no servidor, regenerar com `render()`
perde a formatação, os comentários e a ordem dos campos. `sync_question`
resolve isso. Hoje nenhum fluxo usa a função: ela prepara um editor web
futuro. As duas leis definem a v1. O status da questão está fora do escopo:
a CLI o tira do caminho do arquivo (`_` no início marca rascunho).

## Contrato

```python
def sync_question(src: str, target: Question) -> str: ...
```

Função pura (sem I/O), exportada em `mdq/__init__.py`, implementada em
`mdq/_sync.py`. Recebe o texto fonte atual e o novo estado. Devolve o fonte
com o menor número de edições que leva de um ao outro.

Leis (testes de propriedade com hypothesis, `mdq.hypothesis.questions()`):

1. **Correção:** `parse(sync_question(src, t)).to_dict() == t.normalize().to_dict()`
2. **Identidade:** `sync_question(src, parse(src)) == src`, byte a byte.

A lei 1 vale sobre o alvo normalizado, porque render seguido de parse nem
sempre devolve o mesmo documento (`tests/test_normalize_corpus.py`).

Ids: a comparação usa `parse(src, ids="fill")`. Um id que o parse
geraria de qualquer forma conta como igual e não é escrito no arquivo. A lei
1 vale com o mesmo `ids="fill"`.

Erro: `errors.SyncError(MdqError)`, novo. É lançado quando o resultado não
satisfaz a lei 1, mesmo depois do fallback para o `render()` completo. Isso
cobre o caso em que o markdown não consegue expressar o `target`. Nunca há
escrita com perda silenciosa. A CLI trata o erro como conflito.

## Desenho (v1)

1. `parse(src, ids="fill") == target` (comparando `to_dict()` depois de
   normalizar) → devolve `src` sem tocar. Isso garante a lei 2.
2. Front matter: diff entre os dados do front matter de `target` e os de
   `parse(src)`. Cada diferença vira uma edição pontual no texto:
   * As posições vêm de `yaml.compose` com `_parser._frontmatter._FrontmatterLoader`
     (marks de início e fim de cada nó). Nada de dependência nova e nada de
     `ruamel.yaml`.
   * Valor alterado: troca só o trecho do nó. Escalar → escalar, no estilo
     de `dump_yaml`. Coleção alterada → desce recursivamente em mapas
     aninhados (`meta`) e, em listas, troca o valor inteiro quando não há
     edição menor.
   * Chave removida: apaga as linhas da chave (e do valor em bloco).
   * Chave nova: acrescenta no fim do mapa, com a indentação dos irmãos.
   * Sem front matter no fonte e campo novo: cria o bloco `---`.
   * `comment` (linhas `#` iniciais): reescreve só essas linhas, e só se
     o comment mudou.
3. Poda: uma edição só fica se, sem ela, o parse deixa de dar `target`. Isso
   resolve a não injetividade (mesmo valor escrito de forma diferente).
4. Corpo: se os campos que vêm do corpo mudaram, o corpo inteiro é
   reescrito com o `render()` canônico (a parte depois do front matter).
5. Verificação da lei 1. Se falha, fallback para `target.render()`
   completo. Se ainda falha, `SyncError`.

### Campos com mais de uma origem no fonte

Regra: editar na origem em que o valor está hoje. Se o campo não existia,
usar a origem do `render()` canônico. Combinado com a sessão cli-1c:

* `id` no front matter e `[slug]` inline no enunciado: se os dois existem,
  atualizar os dois. Assim o fonte não fica contraditório e o aviso não vira
  permanente.
* numeric `domain`/`decimalPlaces` inferidos do corpo: se o valor do
  `target` é o que a inferência já dá, não escrever nada. Só materializar no
  front matter quando divergir.
* fill-in `domain`, `decimalPlaces`, `preAccept`, `preReject`,
  `incorrectFeedback`: por blank, cada blank mantém a origem que já usa.

A auditoria completa dessa lista faz parte da tarefa 1. Um campo novo com
origem ambígua vai para a sessão cli-1c e para o humano, e não é decidido em
silêncio.

## Fora da v1

* Corpo com edição mínima: preservar parágrafos, alternativas e feedbacks não
  alterados e reescrever só o trecho que mudou. A assinatura não muda.
* `sync_exam`: issue própria.

## Plano para subagentes

Cada tarefa tem menos de 200k tokens e é entregue a um agente novo.

1. **Auditoria (investigator).** Listar cada campo do modelo de questão e a
   sua origem no fonte (chave do front matter, transformação, corpo). Saída:
   uma tabela nesta issue (comentário) e a lista de campos ambíguos.
2. **Testes (tester), em paralelo com 3.** `tests/test_sync_question.py`:
   * propriedades: lei 2 sobre o corpus `examples/` e sobre
     `questions()` renderizadas; lei 1 com `target` derivado do parse e com
     um campo do front matter alterado;
   * exemplos: escalar alterado preserva comentários, aspas e linhas em
     branco; chave aninhada em `meta`; lista; chave removida e chave nova sem
     reordenar; comment; front matter ausente; os três casos de origem dupla;
     ids preenchidos não escritos; `SyncError`.
3. **Implementação (implementer).** `mdq/_sync.py`, `errors.SyncError`,
   export em `mdq/__init__.py`, página em `docs/api/`, changelog do mdq-py.
4. **Revisão (reviewer + breaker).** Contraexemplos às leis. Um conflito
   entre as leis vai para a sessão cli-1c, e nenhuma lei é enfraquecida em
   silêncio.

Pronto quando `r2 check-py` passa.

---
by: claude

## Tarefa 1: auditoria de origem dos campos (investigator)

Fontes: `_parser/_question.py`, `_parser/_frontmatter.py`, `_numeric.py`, `_fill_in.py`, `_choices.py`, `_ordering.py`, `_code.py`; render em `models/*.frontmatter()` e `_render_lines()`. Tudo verificado executando `mdq.parse` + `render()` + `normalize()` (probes em `$TMPDIR`, fora da árvore).

Siglas: FM = front matter. "passa" = `copy_passthrough_fields` (copia sem transformar, só chaves da tabela do tipo e só se o corpo não setou). "comum" = `common_frontmatter` (copia `id`, `uuid`, `title`, `author`, `locale`, `meta`; `tags` transformado; `comment` das linhas `#`). Injetiva = uma única forma no fonte dá o valor.

### Tabela

| campo | tipo(s) | origem no fonte | transformação / injetiva? | origem do render |
|---|---|---|---|---|
| `type` | todos | corpo (inferido) ou FM `type`; FM tem de concordar com o corpo (senão ParseError). Em lista de escolhas: `*`/`%` mc, `x` ms, letras tf, tudo `[ ]` ms | não injetiva: FM explícito e inferido dão o mesmo valor. FM só decide o caso lista toda `[ ]` (inferido = ms; `type: multiple-choice` dá mc) | NUNCA escreve `type` no FM. Vem do corpo (ver surpresa S1) |
| `id` | todos | FM `id` OU `[slug]` inline no início do stem | FM vence com aviso `redundant-id` (`_question.py:~470`). Não injetiva (duas origens) | inline `[id] stem` só se o FM canônico tem só `id`, id casa `SLUG_BODY_RE`, `can_inline_id(stem)` e não há comment; senão FM |
| `uuid`, `title`, `author`, `locale` | todos | FM (comum) | cópia. Injetiva. `author` é `strip`ado no `normalize` | FM, ordem `id, uuid, title, author, locale, meta`, depois `weight`, `tags`, depois chaves do tipo; `dump_yaml` ordena chaves (sort_keys) |
| `meta` | todos | FM (comum) | cópia, sem transformação | FM |
| `tags` | todos | FM | string com vírgulas vira lista (strip em cada parte, descarta um vazio final); lista passa como está. NÃO injetiva: `"a, b"` == `[a, b]`; ausente == `[]` == `null` | FM lista em bloco, só se não vazia |
| `weight` | todos | FM, passa | YAML `1` e `1.0` viram float 1.0. Não injetiva (int/float, e `weight: 1` == ausente) | FM só se != 1.0 (`2.0`, escrito como float) |
| `comment` | todos | linhas `#` iniciais do FM (`_extract_comment`) | junta as linhas com espaço, strip. NÃO injetiva: `# a`/`# b` == `# a b` | linhas `# ...` no topo do FM; um comment com `\n` sairia em N linhas e relê como 1 com espaço (normalize não corrige, só `rstrip` por linha) |
| `stem` | todos | corpo antes da tag/lista (sem o `[slug]`) | blocos juntos; parágrafos com soft-wrap colapsam em 1 espaço. Não injetiva (wrap) | corpo, com `[id] ` na frente se inline |
| `epilogue` | todos | corpo depois do corpo/tag e antes da 1a seção | idem stem | corpo, após linha em branco |
| `attachments` | todos | seção `## [attachments]` (corpo) | cópia estruturada | seção do corpo |
| `choices[].text/feedback/comment` | mc, ms, tf, blank de escolha | corpo (itens, `>` feedback, `!` comment) | strip ASCII | corpo |
| `choices[].id` | mc, ms, tf, blank | `[id]` inline após o marcador, só isso | injetiva. `ids="fill"` do parse gera ids derivados do texto (não existem no fonte) | `[mark] [id] texto` se `id` setado |
| `choices[].score` | mc | marcador: `*`=1, `N%`, `[ ]`=ausente | NÃO injetiva: `*` == `100%`; qualquer valor desconhecido == `[ ]` | `*` se 1.0, `[ ]` se None, `N%` |
| `choices[].correct` | ms, tf | marcador (`x`/` ` em ms; letra em tf) | tf: ver `marker` | idem |
| `choices[].marker` | tf | texto do marcador (`T`, `V`, ...) | cópia; `correct` deriva dele | `marker` ou `T`/`F` |
| `shuffle`, `grading` | mc, ms, tf, fill-in | FM, passa | `inherit` explícito == ausente (não injetiva) | FM, só se != `inherit` |
| `answer`, `unit`, `tolerance` | numeric | corpo `[numeric(unit)]: valor +- tol` | `answer`: int se cabe em 32 bits, float se o repr ida e volta, senão string (`"2.50"`, `"1/3"`). Tolerância relativa em % vira fração. Não injetiva (`1e3` == `1000`? não: `1e3` é float 1000.0, `1000` é int; `+5`==`5`) | `render_numeric_tag` |
| `domain` | numeric | FM `domain` OU inferido do corpo (integer/decimal/fraction; tolerância absoluta decimal força decimal) | FM vence. NÃO injetiva. Ver A2 | FM sempre que `domain != None` (o parse sempre preenche), ver S2 |
| `decimalPlaces` | numeric | FM OU inferido (só se domínio final = decimal) | FM vence, mesmo com domínio integer. Não injetiva. Ver A2 | FM sempre que != None |
| `incorrectFeedback` | numeric, short-answer, ordering | FM, passa | cópia | FM |
| `accept`, `reject` | short-answer | corpo (`[short-answer]:` e `[short-answer/reject]:`; lista ou 1 linha) | strip; entrada sem feedback/comment vira string no fonte e `{pattern}` no modelo. Injetiva depois de normalizar | corpo |
| `preAccept`, `preReject` | short-answer | FM, passa | entradas `str` ou `{pattern,...}`: não injetiva na forma | FM, `_pattern_entry` (str se sem feedback/comment) |
| `diacritics` | short-answer, fill-in | FM, passa | `fold` explícito == ausente | FM só se != `fold` |
| `unmatched` | short-answer, fill-in, ordering | FM, passa | ordering: `incorrect` explícito == ausente (default `incorrect`). sa/fill-in: default `None` distinto de `incorrect` | FM (ordering: só se != `incorrect`; sa/fill-in: se != None) |
| `content` | essay | FM `content`, passa | `text` explícito == ausente | FM só se != `text` |
| `highlight` | essay | FM, passa | cópia | FM |
| `content`, `highlight` | ordering | corpo (lista = `text`, fence = `code`; highlight = linguagem da fence). NÃO aceita FM | derivado | corpo |
| `lines`, `extra`, `accept`, `reject` (ordering) | ordering | corpo (`[ordering]:` e seções `## [extra]`/`[accept]`/`[reject]`, feedback `>`/comment `!`) | níveis de indentação via `ordering_unit` (não injetiva em espaçamento) | corpo |
| `indentation`, `normalizations` | ordering | FM. `normalizations` é transformado (`_normalize_list`): string com vírgulas vira lista, lista passa. `indentation` passa | `normalizations`: `"a, b"` == `[a, b]`. `indentation: fixed` == ausente | FM (`normalizations` só se não vazio) |
| `language`, `file` | code | FM, passa | cópia | FM |
| `template`, `tests`, `rubric`, `answerKey` | code | seções `## [template]`, `[tests]`, `[rubric]`, `[answer-key]` | `template` guarda o fence inteiro | seções, nessa ordem |
| `answerKey` | essay | seção `## [answer-key]` | texto | seção |
| `blanks[].id/type` | fill-in | `[^id]` no stem + definições `[^id]:`, `[^id/numeric]:`, `[^id/short-answer]:` | tipo vem da definição | corpo |
| blank numeric `answer/unit/tolerance` | fill-in | corpo `[^id/numeric]: ...` | como numeric | corpo |
| blank numeric `domain`, `decimalPlaces` | fill-in | FM mapas `domain: {id: ...}`, `decimalPlaces: {id: ...}` OU inferido do corpo | mapa vence (`numeric_fields`); entrada `null` == ausente. Ver A3 | FM mapas, para todo blank numeric com valor (o parse preenche `domain` de todo blank numeric) |
| blank sa `accept`/`reject` | fill-in | corpo (definições `[^id/short-answer]:` e `/reject`) | |  corpo |
| blank sa `preAccept`/`preReject`/`incorrectFeedback` e blank numeric `incorrectFeedback` | fill-in | FM mapas por id (sem forma no corpo) | `null` == ausente | FM mapas por id |
| `start`, `duration` | só prova | n/a em questão (estão em `_TRANSFORMED_KEYS` por causa da prova; FM de questão não os admite) | | |

Campos do FM que são lidos pelo parse mas não são campo do modelo: nenhum. Chaves FM desconhecidas viram erro `invalid-frontmatter-field` (não preservadas).

### Campos ambíguos (mais de um lugar no fonte)

- **A1. `id`**: FM `id` e `[slug]` inline no stem. FM vence; ambos presentes dá `redundant-id` (warning). Confirmado.
- **A2. numeric `domain` e `decimalPlaces`**: FM ou inferência do corpo; FM vence. `numeric_fields` (`_numeric.py`) faz o parse SEMPRE preencher `domain` (e `decimalPlaces` se decimal) no dict. Logo, depois do parse, "declarado" e "inferido" são indistinguíveis no modelo: só o texto fonte diz se estava no FM. Confirmado. Efeito: a regra da issue "não escrever se igual à inferência" não pode ser decidida só pelo modelo, tem de olhar o fonte (`parse(src)` vs `yaml.compose` do FM) ou recalcular a inferência a partir de `answer/tolerance` (existe `_written_domain_and_places` em `models/_numeric.py`).
- **A3. fill-in blank numeric `domain`/`decimalPlaces`**: mapa por id no FM vs inferência da definição do blank. Mesma mecânica de A2, por blank. Confirmado. Para blank short-answer `accept/reject` (corpo) e `preAccept/preReject` (FM) são campos DIFERENTES: não é ambiguidade.
- **A4. `type`** (novo): FM `type` vs inferido do corpo. Só decide numa lista de escolhas toda `[ ]` (ms inferido; mc/ms por FM). Fora isso o FM só pode concordar. O render nunca escreve `type` (S1).
- **A5. `comment`/multilinha** (novo, mais fraco): não é duas origens, mas `# a`/`# b` e `# a b` dão o mesmo valor.
- **A6. valores default explícitos** (novo, não-injetividade, resolvida pela poda da issue): `shuffle/grading: inherit`, `diacritics: fold`, `indentation: fixed`, ordering `unmatched: incorrect`, essay `content: text`, `weight: 1`, `tags: []`, `title: ~` e chave ausente dão o mesmo modelo. O render omite todos.
- **A7. `tags`/`normalizations` string vs lista** e **mc `*` vs `100%`**: mesma não-injetividade, mesma poda.

Não há outra origem dupla: `choices[].id` só tem `[id]` inline; `answerKey`, `attachments`, `lines/extra/accept/reject` só corpo; `tags`, `weight`, `meta`, `language`, `file`, `preAccept/preReject` (question) só FM.

### Surpresas

- **S1. `render()` nunca escreve `type`.** `models/_base.py` `frontmatter()` não inclui `type`. Um mc com todas as alternativas `[ ]` (`type: multiple-choice` no FM) renderiza sem `type` e relê como multiple-selection. `normalize()` não corrige. Lei 1 (`parse(sync(...)) == normalize(target)`) falha para esse alvo, mesmo no fallback `render()`: vira `SyncError` (ou o sync tem de escrever `type` no FM, o que o render canônico não faz).
- **S2. render de numeric escreve `domain` (e `decimalPlaces`) no FM sempre** que o modelo tem valor, e o parse sempre preenche. Um `[numeric]: 42` vira `---\ndomain: integer\n---` no render. O render canônico não é "mínimo". `NumericQuestion.frontmatter` (`models/_numeric.py:~321`) só pula `domain` quando é None e igual ao inferido, mas isso nunca vale após parse ou `normalize()`. Mesmo vale para os mapas de fill-in: `domain: {b: integer}` aparece no render do exemplo `[^b/numeric]: 7`.
- **S3. `ids="fill"` muda o modelo**: o parse com `fill` coloca `choices[].id` derivados; o render escreve `[alpha]` em cada alternativa. Sem `fill` esses ids não são escritos. A comparação da issue tem de usar `fill` dos dois lados, e o arquivo não deve ganhar `[id]` derivado.
- **S4. `weight`**: `weight: 2` (int) volta como `2.0` no render. Escalar alterado "no estilo de `dump_yaml`" muda int em float.
- **S5. `render()` ordena as chaves do FM alfabeticamente** (`yaml.dump` com sort_keys): `weight`, `tags` não vêm depois de `meta` como o código sugere. Relevante só para o fallback; a edição pontual preserva a ordem do fonte.
- **S6. Sempre que o FM canônico fica vazio e o id é slug, o render usa `[id]` inline e não escreve FM.** Mudar `title` num fonte com `[id]` inline exige migrar o id para o FM (render faria isso) ou criar um FM e manter o inline (então o parse emite `redundant-id`, e o FM vence).

### O que `normalize()` altera (campos)

Base (`BaseQuestion._normalize`): `stem` (via `reconstruct_blocks`: blocos reconstruídos, soft-wrap colapsa, fences abertas fechadas), `epilogue` (idem; vazio vira None), `comment` (rstrip por linha; vazio vira None), `tags` (strip, descarta vazias), `author` (strip).
- choice (mc/ms/tf): `choices[].text/feedback/comment` com strip ASCII (feedback/comment vazios viram None). tf: `marker` preenchido com `T`/`F` quando ausente.
- numeric (e blank numeric): `answer` relido do spelling que o render escreve, até estabilizar (float `1000.0` vira `"1e3"` reconhecido etc.); `domain` preenchido com o inferido se None; `decimal_places` preenchido com o inferido se None e domínio decimal.
- short-answer (e blank sa): `accept`/`reject` com strip em `pattern/feedback/comment`; `preAccept/preReject` ficam como escritos.
- ordering: `accept`/`reject` com strip em `feedback/comment`.
- fill-in: `blanks[].normalized()` (numeric e sa como acima; choice blank nada).
- essay, code: só a base.
- Não toca: `id`, `uuid`, `title`, `locale`, `meta`, `weight`, `attachments`, `type`, `shuffle`, `grading`, `lines`, etc.

### Implicações para a v1 de `sync_question`

- A2/A3: a inferência (`_written_domain_and_places`, `infer_decimal_places`) está em `models/_numeric.py`; `_sync.py` pode importá-la (mesmo pacote lógico, via `_parser.numeric_fields` ou o modelo). Decidir pelo texto fonte (FM tinha a chave?) é mais seguro que recalcular.
- S1 é um conflito real entre a lei 1 e o `render()`: ou o `render()` passa a escrever `type` quando o corpo não o determina (mc com todos `[ ]`), ou o sync trata esse alvo escrevendo `type` no FM por conta própria. Vai para a cli-1c / humano, não decidido aqui.
- S2: o render canônico do corpo/FM de numeric não é o mesmo que a edição mínima produziria; só afeta o fallback.

---
by: claude

Mudanças de contrato combinadas com a sessão cli-1c depois da revisão adversarial:

* **Lei 1 módulo normalização:** `parse(out, ids="fill").normalize().to_dict() == target.with_ids().normalize().to_dict()`. Contraexemplo da forma anterior: `author: ' Ana '` faz `parse` diferir de `normalize()`, e a lei 2 obriga a devolver o fonte intocado. O parse não muda: strip de `author`/`tags` é assunto de spec.
* **Ids:** um id igual ao que o parse derivaria do fonte resultante não é escrito; um id diferente é escrito explícito. Mudar o texto de uma alternativa sem id explícito grava o id antigo (`[amazonas]`), porque o id é a identidade da alternativa e respostas podem apontar para ele.
* **Inferidos velhos** (`domain`/`decimalPlaces` quando `answer` muda): responsabilidade de quem edita (futuro editor web). O `sync_question` não tenta adivinhar.
