---
type: issue
status: backlog
tags: [mdq-py, sync]
relatedTo: [mdq-py-sync-question-escrita-de-volta-com-edicao-minima]
kind: enhancement
created: 2026-11-12
creator: claude
---

# mdq-py: sync_question v2, edição mínima do corpo

A v1 de `sync_question` reescreve o corpo inteiro com o `render()` canônico quando um campo do corpo muda. A v2 preserva os trechos não alterados (parágrafos do enunciado, alternativas, feedbacks, seções) e reescreve só o trecho que mudou. A assinatura e as duas leis não mudam (ver a issue da v1 e o seu comentário de contrato).

Pendências da v1 que entram aqui:

* Listas regravadas no front matter (`preAccept` etc.) saem com a indentação de `dump_yaml`, não com a do fonte.
* Mapa ou lista em estilo flow é trocado inteiro.
* Remover a última chave deixa `---\n---` em vez de remover o bloco.

---
by: claude

Achados menores da 2ª rodada de ataque à v1. A lei 1 e a lei 2 valem em todos; nenhum causa `SyncError` indevido. O problema é só minimalidade:

1. **Comentário YAML promovido a `comment`.** Remover a primeira chave (ou o `comment`) deixa um `# ...` no topo do front matter, o parse o lê como `comment`, e o resultado cai no `render()` completo. Ex.: `---\ntitle: Rios\n# revisar em 2027\nauthor: Ana\n---\n...` com `title=None`. Direção: tirar as linhas `#` do topo antes do fallback, ou manter uma chave antes delas.
2. **Inferidos gravados junto.** `_Front._append_added` põe todas as chaves novas (e o mapa inteiro) num único `_Edit`, e `_prune` não consegue remover parte. Ex.: numeric `[numeric]: 26` com `domain="decimal"` grava também `decimalPlaces: 0`; fill-in grava `domain: {n: decimal, m: integer}`. Direção: um `_Edit` por chave e por entrada de mapa.
3. **`preAccept`/`preReject` de short-answer (fora do fill-in)** viram `- pattern: x`: `_pattern_form` só é aplicado no laço dos blanks.
4. **Mapa aninhado esvaziado** deixa a chave pai vazia (`domain:`).
5. **Chave nova depois de bloco `|+`** cai no fallback.
6. **Chave nova em front matter flow na raiz** (`{title: a}`) cai no fallback e regrava o corpo.
7. Cosmético: a regravação do corpo descarta as linhas em branco extras no fim do arquivo.
