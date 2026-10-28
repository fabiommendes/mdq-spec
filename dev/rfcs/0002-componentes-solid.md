---
type: rfc
status: draft
tags: [mdq-js, solid, componentes, css, i18n]
relatedTo: [dev/rfcs/0001-mdq-js-paridade.md, mdq-js/docs/sync/roadmap.md]
---

# RFC 0002: componentes SolidJS da mdq-js

## Contexto

- O codehood tem componentes SolidJS para cada tipo de questão
  (`codehood/src/components/question/`). Eles dependem da implementação MDQ
  própria do codehood (`codehood/src/mdq/`), do paraglide (i18n) e de classes
  Tailwind + daisyUI escritas direto no JSX.
- A RFC 0001 deixou os componentes (F8) para uma RFC própria, depois da
  paridade. A paridade fechou em 2026-10-27.

## Objetivo

Extrair os componentes para a mdq-js, um tipo por vez, corrigindo os bugs
encontrados. Primeiro passo: múltipla escolha e os componentes base que ela
usa.

## Decisões

1. **Dados públicos.** O componente recebe a forma pública da questão (sem
   dados de resposta) e, no modo `review`, um resultado opcional com o
   gabarito. A divisão entre campos públicos e privados entra no spec
   (`docs/`) e na mdq-py primeiro; a mdq-js porta depois. A sessão mdq-py
   coordena essa parte.
2. **Pacote.** Um pacote só, subpath `mdq/solid`. `solid-js` continua peer
   opcional.
3. **CSS semântico.** Os componentes emitem classes `mdq-*` e o estado em
   atributos `data-*` (`data-mode`, `data-state`). Nenhuma classe de
   framework no JSX. Entregamos dois arquivos:
   - `mdq/css/plain.css`: estilo mínimo, focado em função (layout, foco,
     estado visível), não em aparência.
   - `mdq/css/daisyui.css`: mapeia as classes semânticas para daisyUI 5 com
     `@apply`. Exige Tailwind v4 + daisyUI 5 no consumidor.
4. **i18n.** Um dicionário global `Messages` para todos os componentes, com
   inglês por padrão. Cada componente de topo aceita uma prop `messages`
   parcial, mesclada sobre o padrão; `<MdqProvider>` é opcional. Motivo: o
   codehood hidrata cada questão como ilha do Astro, e um contexto só vale
   dentro da ilha. Não há setter global: no SSR, um idioma em variável de
   módulo é compartilhado entre requisições simultâneas. Entregamos `ptBR`.
5. **Markdown.** Instância própria de markdown-it para exibição, com
   `html: false`, separada da instância do parser.
6. **Distribuição.** `exports["./solid"]` tem só a condição `"solid"` (JSX
   preservado, `dist/solid/*.jsx`), para quem compila com o preset do Solid.
   Um build já compilado (DOM e SSR separados) fica para quando aparecer um
   consumidor que não compila Solid.
7. **Integração.** A sessão codehood troca os componentes do codehood pelos
   de `mdq/solid`, um tipo por vez, na ordem: MultipleChoice, TrueFalse,
   MultipleSelection, ShortAnswer, Numeric, Essay, FillIn. Os testes
   Playwright do codehood servem de oráculo de comportamento.

## Bugs do `MultipleChoiceView` do codehood

- `aria-describedby` aponta para o feedback mesmo quando ele não é
  renderizado (fora do modo `review`).
- O `fieldset` não tem nome acessível (nem `legend`, nem `aria-labelledby`).
- Modo controlado sem `onChange`: o radio nativo muda no DOM e o estado não.
- O feedback por alternativa é ignorado.
- Os ícones são `aria-hidden` com `<title>`: o título nunca é lido, então o
  modo `review` não diz a um leitor de tela o que está certo ou errado. Agora
  o texto vai num `.mdq-sr-only` ao lado do ícone.
- O feedback usa `role="alert"`, que interrompe o leitor de tela em toda
  carga da página. Agora é um bloco comum.

## Diferenças em relação ao codehood

- A questão vem de `publicForm()` (`docs/public-form.md`). O spec não tem
  `preamble`, então o componente não o mostra.
- `result` é `QuestionScore` (`score`, `feedback: string[]`) mais
  `correct?`, que vem de `correctResponses()`. Uma alternativa é correta
  quando tem score 1, não quando tem o maior score.

## Fora de escopo

- `ChoiceSelect` (usado só pelo fill-in). Entra com o fill-in.
- Outros frameworks CSS além de daisyUI.
