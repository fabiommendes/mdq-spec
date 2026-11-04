---
type: adr
status: accepted
tags: [mdq-js, solid, css, i18n]
created: 2026-11-04
decided: 2026-11-04
creator: claude
---

# Componentes SolidJS: CSS semântico, i18n por prop, sem Temporal, export condicional

## Contexto

A mdq-js passou a entregar componentes SolidJS em `mdq/solid` para o codehood, que hidrata cada questão como ilha do Astro (`dev/rfc/0002-componentes-solid.md:34-52`). Um `css/daisyui.css` chegou a existir e amarrava o pacote a Tailwind v4 e daisyUI 5 (commit 1341e3a, 2026-11-01). Um idioma em variável de módulo é compartilhado entre requisições simultâneas no SSR (`mdq-js/src/solid/messages.tsx:5-8`). Temporal exigiria polyfill em Node 22/24 e Safari, TS 6 e cerca de 20 kB gzip a mais; o schema guarda `start` e `duration` como strings (`dev/notes/temporal-for-exam-schedule.md:156-166`).

## Opções

Para cada ponto, as alternativas que o RFC e as notas registram:

1. CSS: classes de framework no JSX e folha daisyUI no pacote; ou classes semânticas `mdq-*` com `plain.css` mínimo.
2. i18n: setter global de idioma ou contexto único; ou prop `messages` por componente com `<MdqProvider>` opcional.
3. Datas: Temporal com polyfill; ou strings com uma costura interna.
4. Distribuição: build compilado DOM e SSR; ou só a condição `solid` com JSX preservado.

## Decisão

- Classes semânticas `mdq-*` e estado em `data-*`; nenhuma classe de framework no JSX; só `css/plain.css` é entregue e `daisyui.css` foi removido (`dev/rfc/0002-componentes-solid.md:36-43`; commits 1341e3a, 144a1eb). Razão: não amarrar o pacote a um framework CSS.
- Um dicionário `Messages` com inglês padrão; cada componente de topo aceita a prop `messages`, mesclada sobre o provider quando existe; sem setter global (`mdq-js/src/solid/messages.tsx:1-12`; RFC 0002, item 4). Razão: uma ilha Astro é sua própria árvore Solid e um provider na página não a alcança; um locale de módulo vaza entre requisições no SSR.
- Sem Temporal: `start` e `duration` ficam strings; `schedule.ts` tem uma função por campo com parse e format internos, que lança `RangeError`, para Temporal substituir o interior sem mudar a API (`mdq-js/docs/sync/roadmap.md:56-63`; `mdq-js/src/schedule.ts:10`). Revisar quando Node 26 for o mínimo da CI, Safari tiver Temporal e o repo usar TS 6.
- `exports["./solid"]` só com a condição `solid` (`mdq-js/package.json:13-16`; RFC 0002, item 6). Razão: o consumidor atual compila Solid; um build compilado fica para quando aparecer quem não compile.
- `solid-js` é peer opcional (`mdq-js/package.json:46-54`).

## Consequências

- Um consumidor em daisyUI mantém a própria folha para as classes `mdq-*`.
- Um consumidor sem preset do Solid não consegue importar `mdq/solid` hoje.
- `playground/` é um app Vite separado e não publicado para ver e testar os componentes (commit 1341e3a).
