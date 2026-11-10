---
type: issue
status: backlog
tags: [spec, essay, grading, rubric]
relatedTo: [docs/question-types/essay.md, docs/references/choices.md]
---

# Rubrica de correção nas questões

O Codehood vai ter rubricas para correção manual (spec `rubrica-de-correcao`
no repositório do codehood). A rubrica de cada questão de uma prova vive no
servidor e muda durante a correção. O mdq deve carregar a **rubrica inicial**:
o servidor copia essa rubrica quando a correção da questão começa, e a partir
daí o push não a altera mais.

Sintaxe proposta, que reaproveita as linhas de feedback (`>`) e de comentário
(`!`) dos itens de `choices`
([Feedback and comment lines](../../docs/references/grammar.md#feedback-and-comment-lines)):

```md
Explique a força que age sobre o corpo.

[essay]

[rubric]:
* [+0.25] Identifica corretamente o termo de aceleração
  ! Alunos costumam confundir com força centrípeta
  > A aceleração vem só da gravidade
* [-0.1] Erra a unidade
```

- O texto do item é o critério, visto pelo corretor e pelo aluno.
- `!` é o comentário para o autor ou o corretor, privado.
- `>` é o feedback mostrado ao aluno quando o item foi aplicado à resposta
  dele.
- `[+0.25]` é o valor com sinal, como fração da nota da questão.

## A decidir

- Grupos de itens que se excluem (níveis de um critério). Proposta do
  Codehood: lista plana com caminho de grupo antes do `:`, de profundidade
  arbitrária, e uma escolha por grupo de primeiro nível:

  ```md
  [rubric]:
  * [+0.5] Recursão: Correta
  * [+0.2] Recursão/Errada/Caso base: Esqueceu o caso base
  * [+0.1] Recursão/Errada: Caso base errado
  * [-0.1] Usa `is` com variável livre
  ```
- Pontuação base: os itens somam a partir de 0, ou descontam a partir de 1.
  Pode ser um campo do frontmatter ou uma opção do próprio `[rubric]`.
- Id estável por item (`* [+0.25] {acel} ...`?), para que o servidor e a CLI
  se refiram ao item sem depender da posição.
- Quais tipos aceitam `[rubric]`: `essay` com certeza. Em `fill-in` e
  `short-answer` com resposta pendente também faz sentido.
- Forma no JSON: o lugar no documento privado e o que a forma pública
  remove (a rubrica inteira, até a liberação das notas).
- Schema, lints, exemplos no corpus, suporte no mdq-py e no mdq-js.

---
by: claude

A RFC `questoes-de-codigo-com-correcao-automatica-tipo-code` depende desta issue e assume três mudanças na proposta: (1) a rubrica é uma seção `## [rubric]`, não a tag `[rubric]:`, porque fica depois do epílogo como `## [answer-key]`; (2) os valores são pontos relativos, normalizados pela soma dos itens positivos, e não frações da nota; (3) todo item tem um vínculo explícito, `{manual}` para correção à mão. Decidir aqui se (2) e (3) valem também para o essay.

---
by: claude

O RFC `questoes-de-codigo-com-correcao-automatica-tipo-code` foi aceito e fixa, para a rubrica de todo tipo: seção `## [rubric]` antes de `## [answer-key]`; valor `[+3]`, `[3]`, `[-2]`, `[0]` em pontos relativos, sem espaço nos colchetes, omitido vale 1; modificadores em chaves, um por par, com `{manual}` obrigatório nos itens de `## [rubric]`; nenhum id de item na v1, e um critério que começa com `[slug]` é erro; a rubrica é privada na forma pública. Ficam para esta issue: grupos de itens que se excluem e a pontuação base.
