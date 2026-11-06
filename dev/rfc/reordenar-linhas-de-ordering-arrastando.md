---
type: rfc
status: accepted
tags: [mdq-js, solid, ordering]
relatedTo: [0002-componentes-solid]
created: 2026-11-05
decided: 2026-11-05
creator: Fábio Macêdo Mendes
---

# Reordenar linhas de ordering arrastando

## Contexto

`Ordering` (`mdq-js/src/solid/Ordering.tsx`) reordena linhas só por botões:
subir, descer, recuar, avançar e deixar de fora. Numa questão de 8 linhas,
levar a última ao topo custa 7 cliques, e o aluno precisa achar o botão certo
em cada linha. Na prova isso é lento e cansativo.

Este RFC troca o modo principal por arrastar e soltar, sem perder o uso por
teclado e por leitor de tela, que o componente hoje garante.

## Decisões

- **D1. Implementação própria com pointer events**, sem biblioteca. Funciona
  com mouse, caneta e toque. `@thisbeyond/solid-dnd` foi descartada: está em
  0.x, sem release desde 2023, não faz rolagem automática e o código de cola
  para duas listas é quase do tamanho da implementação própria. HTML5 drag and
  drop foi descartado porque não funciona em toque.
- **D2. Botões subir e descer saem da linha.** Uma alça (`⠿`) no início da
  linha substitui os dois: ela é o ponto de arraste e, com foco, move a linha
  pelas setas do teclado.
- **D3. O nível continua nos botões.** Recuar e avançar ficam visíveis sob
  `lenient` e `strict`. Arrastar na horizontal não muda o nível.
- **D4. Toque arrasta só pela alça; mouse e caneta arrastam pela linha toda.**
  Arrastar pela linha toda no toque impediria rolar a página sobre a lista.
- **D5. A lógica de posição é pura** e fica em `src/solid/ordering-drag.ts`,
  testável sem layout. O componente só mede as linhas e chama essas funções.

## Requisitos

### Arrastar

**R1.** Em `answer`, toda linha das duas listas (`used` e `unused`) pode ser
arrastada. Em `readonly` e `review` nada se arrasta e não há alça.

**R2.** O arraste começa quando o ponteiro anda 4 px ou mais depois do
`pointerdown`. Abaixo disso, nada acontece: um clique num botão da linha
continua sendo um clique. `pointerdown` sobre um botão de ação
(`.mdq-ordering-button`) não inicia arraste.

**R3.** Durante o arraste:

- a linha arrastada segue o ponteiro na vertical e tem `data-dragging`;
- o elemento raiz (`.mdq-question`) tem `data-dragging`;
- um marcador (`.mdq-ordering-drop`) mostra onde a linha vai cair;
- a lista `unused` aparece mesmo vazia, com a nota
  `messages.orderingDropUnused`, para servir de destino.

**R4.** O destino é a lista cujo painel (`.mdq-panel`) está sob o ponteiro. Dentro dela, a posição é o número
de linhas (sem contar a arrastada) cujo centro vertical fica acima do
ponteiro. Fora das duas listas, vale a última posição válida; se nunca houve
uma, soltar cancela.

**R5.** Soltar aplica:

| De       | Para     | Efeito                                           |
| -------- | -------- | ------------------------------------------------ |
| `used`   | `used`   | move a linha para a posição                      |
| `used`   | `unused` | deixa a linha de fora (como o botão "Leave out") |
| `unused` | `used`   | insere a linha na posição, com o nível do pool   |
| `unused` | `unused` | nada (a ordem de `unused` é a do pool)           |

Soltar na posição de origem não muda nada e não chama `onChange`. Toda
mudança passa por `commit`, então `fitLevels` e `onChange` valem como hoje.

**R6.** `Esc`, `pointercancel` ou perda da captura cancelam o arraste: nada
muda.

**R7.** Com o ponteiro a menos de 48 px da borda superior ou inferior da
janela, a página rola nessa direção enquanto o arraste dura.

**R8.** Depois de soltar, a região `aria-live` anuncia a mudança com as
mensagens que já existem (`orderingMoved`, `orderingRemoved`,
`orderingAdded`), e o foco vai para a alça da linha na nova posição.

### Teclado

**R9.** A alça é um `<button>` (`.mdq-ordering-grip`, `data-action="grip"`),
com nome `messages.orderingGrip(text)` ("Move: <text>") e descrição
(`aria-describedby`) `messages.orderingGripHint`. Na lista `used`:

- `ArrowUp` e `ArrowDown` movem a linha uma posição, como os antigos botões;
- `ArrowLeft` e `ArrowRight` recuam e avançam o nível, quando permitido;
- nas pontas a tecla não faz nada;
- o foco segue a alça da linha movida e o anúncio é o de hoje.

Na lista `unused` a alça só arrasta; as setas não fazem nada. O botão `+`
continua lá.

**R10.** Os botões `up` e `down` deixam de existir. Ficam `indent`, `outdent`
(sob `lenient` e `strict`), `remove` e `add`.

### Mensagens

**R11.** Novas chaves em `Messages`, em `en` e `ptBR`:

- `orderingGrip(text)`: "Move: {text}" / "Mover: {text}";
- `orderingGripHint`: "Drag, or use the arrow keys, to move the line." /
  "Arraste, ou use as setas do teclado, para mover a linha.";
- `orderingDropUnused`: "Drop a line here to leave it out." /
  "Solte uma linha aqui para deixá-la de fora.".

`orderingMoveUp` e `orderingMoveDown` saem.

### CSS

**R12.** `css/` ganha `.mdq-ordering-grip` (com `touch-action: none` e
`cursor: grab`), `.mdq-ordering-line[data-dragging]` (acima das outras, com
sombra), `.mdq-ordering-drop` e `.mdq-question[data-dragging]`
(`user-select: none`, `cursor: grabbing`).

## Módulo puro

`src/solid/ordering-drag.ts`, interno (não sai em `src/solid/index.ts`):

```ts
/** Where a line sits: a list and an index in it. */
export interface Slot { list: "used" | "unused"; index: number }

/** The insertion index among `centers` (the lines without the dragged one) for a pointer at `y`. */
export function dropIndex(centers: readonly number[], y: number): number;

/**
 * The new `used` list after moving the line at `from` to `to`, or `null` when
 * nothing changes. `to.index` counts the lines of the target list without the
 * dragged one.
 */
export function relocate(
  used: readonly OrderingLine[],
  unused: readonly OrderingLine[],
  from: Slot,
  to: Slot,
): OrderingLine[] | null;
```

## Testes

- `mdq-js/tests/solid/ordering-drag.spec.ts`: `dropIndex` e `relocate`.
- `mdq-js/tests/solid/ordering.spec.tsx`: os testes dos botões `up` e `down`
  passam para as setas na alça; novos para R9, R10 e R1 (sem alça fora de
  `answer`).
- `mdq-js/playground/e2e/ordering-drag.spec.ts`: arraste real no Chromium com
  mouse (R2 a R6) e com toque emulado (D4), sobre a fixture local
  `playground/fixtures/drag-ordering.mdq.md`. História em
  `playground/stories/reorder-by-drag.md`.

## Fora do escopo

- Mudar o nível arrastando na horizontal.
- Arrastar várias linhas de uma vez.
- Animação das outras linhas abrindo espaço; o marcador basta.
