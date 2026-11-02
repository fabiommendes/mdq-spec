---
type: spec
status: active
tags: [mdq, mdq-py, shuffle, public-form, responses, seed]
relatedTo: [docs/public-form.md, docs/responses.md, docs/exam.md, dev/issues/parametrized-questions.md]
---

# Forma apresentada: embaralhamento determinístico e rótulos opacos

Spec (`docs/`, `examples/`) + Python (`mdq-py/`). O port para `mdq-js/` vem
depois, em outra spec.

## Problema

- Hoje nada embaralha. `shuffle` é só um `bool` (`Exam.shuffle_for`) e
  `docs/public-form.md` deixa o embaralhamento para o host. Cada host
  inventaria o seu, e Python e TS não concordariam.
- A forma pública expõe os ids das choices. Ids de autoria como `[correct]`
  ou `[c1]`..`[c4]` (com a correta quase sempre em `c1`) entregam o gabarito
  a quem lê a API ou monitora os POSTs, mesmo que a UI não mostre os ids.

## Decisões fechadas

- A ameaça é quem inspeciona a API ou o tráfego. A tela não importa: a UI
  não mostra ids.
- O host passa uma seed string. Ela MUST ser imprevisível para o aluno:
  o host deriva, por exemplo, `HMAC(secret, username + ":" + exam_id)`. A lib
  não lida com segredos.
- Cada choice recebe um rótulo opaco derivado de SHA-256(seed, escopo, id).
  O rótulo substitui o id na forma apresentada e nas respostas que vêm do
  cliente.
- A ordem embaralhada é a ordem dos rótulos. Um só hash, sem PRNG.
- Os rótulos são estáveis ao editar a questão: adicionar, remover ou
  reescrever uma choice não muda o rótulo das outras.
- A ordem das questões no exame não é embaralhada.
- Ordering fica de fora: as linhas não têm id, e o pool já é público e
  canônico. O host continua embaralhando o pool como hoje.
- Prova em papel não está no escopo da lib: o renderizador atribui `A`..`E`
  na ordem da forma apresentada.

## Regras

### R1. Escopos

Um escopo é um conjunto de choices que recebem rótulos juntos:

| Tipo                  | Escopo                      | Partes da chave          |
| --------------------- | --------------------------- | ------------------------ |
| multiple-choice       | as choices da questão       | `[qid, choice id]`       |
| multiple-selection    | as choices da questão       | `[qid, choice id]`       |
| true-false            | as afirmações da questão    | `[qid, choice id]`       |
| fill-in, choice blank | as choices do blank         | `[qid, blank id, choice id]` |

- `qid` é o `id` da questão. Uma questão sem `id` usa a string vazia.
- Os outros tipos (numeric, short-answer, essay, ordering) e os blanks que
  não são de choice não têm escopo. A forma apresentada deles é igual à
  forma pública.

### R2. Digest

- Entrada: `seed`, depois as partes da chave, unidas por U+0000, codificadas
  em UTF-8. Ex.: `"s3cr3t\0encontro-das-aguas\0correct"`.
- Digest: SHA-256 da entrada, em hex minúsculo (64 caracteres).
- Uma seed que contém U+0000 é rejeitada com `ValueError`. As partes da
  chave são `SLUG` e nunca contêm U+0000.

### R3. Rótulo

- O rótulo é o menor prefixo do digest, com comprimento em (8, 16, 32, 64),
  que nenhum outro digest do escopo compartilha. O comprimento é por choice:
  quem não colide mantém 8 dígitos, mesmo que outras duas colidam.
- A ordenação por rótulo equivale à ordenação por digest: se `n1 < n2`, o
  rótulo de comprimento `n1` é único entre os prefixos de `n1`, então dois
  rótulos sempre diferem dentro do menor comprimento.
- Estabilidade: adicionar uma choice muda no máximo o rótulo da choice que
  colide com ela.
- O rótulo é hex e casa com `SLUG`. A forma apresentada continua sendo uma
  forma pública válida.

### R4. Ordem

- Com `shuffle` efetivo `true`, as choices do escopo são ordenadas pelo
  rótulo (comparação de strings, que equivale à comparação de bytes do
  digest).
- Com `shuffle` efetivo `false`, a ordem é a do documento. Os rótulos são
  aplicados mesmo assim.
- O `shuffle` efetivo é `Exam.shuffle_for(question)` dentro de um exame e
  `effective_shuffle` fora dele. Num fill-in, ele vale para todos os choice
  blanks da questão.

### R5. Forma apresentada

- É a forma pública (`question.public()`) com, em cada escopo, as choices na
  ordem de R4 e o `id` de cada choice trocado pelo rótulo.
- Os outros campos são os da forma pública, sem mudança. Isso inclui os ids
  da questão e dos blanks.
- Requer uma questão addressable, como `public()`. A spec repete o SHOULD
  de `docs/responses.md`: o host grava os ids derivados no documento antes
  de apresentar. Ids derivados mudam entre implementações e versões, e os
  rótulos mudam junto.

### R6. Respostas

- Resposta apresentada: a resposta de `docs/responses.md` com rótulos no
  lugar dos ids das choices.
  - MC: `response: 7c1e04a9`.
  - MS: lista de rótulos.
  - TF: mapping rótulo -> bool.
  - Fill-in: no valor de cada choice blank, rótulo no lugar do id. As chaves
    continuam sendo os blank ids.
- Traduzir para a resposta real troca cada rótulo pelo id. Um rótulo que não
  existe no escopo gera `ResponseError` (resposta malformada), como um id
  desconhecido hoje. Uma choice removida depois que o aluno respondeu cai
  nesse caso.
- A tradução inversa (resposta real -> apresentada) serve para mostrar de
  novo uma resposta gravada. Ela aceita só ids da questão. Um id
  desconhecido gera `ResponseError`.
- Os outros tipos e blanks passam sem mudança nos dois sentidos.
- O host grava sempre a resposta real. Grading e `score_response` não mudam.

### R7. Exame

- A forma apresentada de um exame resolvido aplica R5 a cada questão, com o
  `shuffle` herdado do exame. As questões ficam na ordem do exame.
- Traduzir as respostas do exame aplica R6 a cada questão, pelo id.

## Interface proposta (Python)

O architect pode ajustar os nomes. A forma é esta:

```python
class Presentation:
    """The labels and order of one question for one seed."""

    def public(self) -> dict[str, Any]: ...          # R5
    def to_response(self, presented: object) -> object: ...   # R6, rótulo -> id
    def to_presented(self, response: object) -> object: ...   # R6, id -> rótulo

class BaseQuestion:
    def presentation(self, seed: str, *, shuffle: bool | None = None) -> Presentation: ...

class Exam:
    def presentation(self, seed: str) -> ExamPresentation: ...
    # ExamPresentation: public(), to_responses(), to_presented_responses()
```

- `shuffle=None` usa `effective_shuffle`. `Exam` passa `shuffle_for(q)`.
- `Presentation` calcula o mapa uma vez. O host pode recriá-lo a cada
  request a partir da seed, sem guardar estado.

## Mudanças em `docs/`

- `docs/public-form.md`: nova seção "Presented form" com R1 a R5 e um
  exemplo. A frase "A host shuffles them if `shuffle` asks for it" passa a
  apontar para ela.
- `docs/responses.md`: a seção Addressability ganha um parágrafo sobre
  respostas apresentadas (R6).
- `docs/exam.md`: a seção de `shuffle` aponta para a forma apresentada.
- Choice types e fill-in: a nota **Shuffle** continua MAY/MUST NOT e ganha um
  link para a forma apresentada. Um host pode embaralhar de outro jeito, mas
  a forma apresentada é o caminho portável.
- Nenhum lint novo.

## Corpus

Novo `examples/presentation.yaml`, no estilo de `examples/public.yaml`:

```yaml
# Case { name, seed, question, shuffle?, presented, responses: [{real, presented}] }
```

- Os digests dos vetores são calculados com `hashlib` e conferidos à mão em
  pelo menos um caso no doc.
- Casos mínimos:
  - MC com `shuffle: true` e com `false`;
  - MS e TF;
  - fill-in com dois choice blanks e um numeric blank;
  - questão sem `id` (qid vazio);
  - seed não ASCII (`"ana.souza:prova-geografia-ç"`);
  - colisão no prefixo de 8. Construir com ids escolhidos por busca e
    registrar no comentário como foram achados;
  - rótulo desconhecido -> `ResponseError`;
  - estabilidade: a mesma questão com uma choice a mais mantém os rótulos
    das outras.

## Critérios de aceitação

- `uv run scripts/spec_audit.py` passa.
- O teste de `mdq-py` roda o corpus `presentation.yaml`.
- `to_response(to_presented(r)) == r` para toda resposta válida dos vetores
  de grading das choice types e do fill-in.
- A forma apresentada não contém nenhum id de choice da questão original
  (teste por propriedade sobre o corpus de grading).
- O `CHANGELOG.md` da raiz e o de `mdq-py/` têm a entrada em `[Unreleased]`.

## Fora do escopo

- Port para `mdq-js/` (`@noble/hashes` para SHA-256 síncrono).
- Seleção seedada do `include-all` (`select_random` ainda usa `random`).
  Vale uma issue separada, com o mesmo digest.
- Questões parametrizadas (`dev/issues/parametrized-questions.md`). Esta
  spec é a base de seed delas.
