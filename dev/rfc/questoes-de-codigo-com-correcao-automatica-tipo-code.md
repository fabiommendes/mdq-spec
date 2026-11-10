---
type: rfc
status: accepted
tags: [spec, code, grading, rubric]
relatedTo: [rubrica-de-correcao, nao-meta-tipo-e-judge]
created: 2026-11-10
decided: 2026-11-10
creator: claude
---

# Questões de código com correção automática (tipo code)

## Contexto

Hoje uma questão de código é um `essay` com `content: code`, sempre de
correção manual. Não há como declarar testes nem como transformar o resultado
de uma execução em nota.

A nota `nao-meta-tipo-e-judge` registrava que um tipo e-judge não era meta do
MDQ. Este RFC reverte essa posição em parte: o MDQ continua sem executar
código, mas passa a **representar** os testes e a **converter** o resultado de
uma execução em nota, por meio de uma rubrica.

O desenho partiu de um levantamento de juízes online (ICPC/Kattis, IOI/CMS,
LeetCode, CodeRunner, VPL, Gradescope, PrairieLearn, check50, nbgrader) e do
`iospec` (github.com/fabiommendes/iospec), uma DSL de 2017 para testes de IO.

Este RFC define o **menor formato possível** e registra os pontos de extensão
conhecidos, para que a v1 não feche nenhum deles.

## Princípios

- **P1. O MDQ nunca executa código.** Ele oferece uma representação em `.md` e
  em JSON. Projetos separados implementam os runners, um por linguagem ou
  formato de teste.
- **P2. O MDQ não interpreta o conteúdo dos testes.** Para o núcleo, um fonte
  de testes é `(formato, texto, origem)`. A validação é só de estrutura.
  Validar a sintaxe do código está fora do escopo.
- **P3. O veredito é do runner; a nota é do MDQ.** O runner devolve um
  relatório com um veredito por caso. O MDQ aplica o relatório à rubrica.
- **P4. Nenhum formato de teste faz parte da spec na v1.** `iospec` e uma
  futura DSL de testes unitários simples são plugins. Um formato que se provar
  útil pode ser incorporado depois.
- **P5. Política de tentativas e de feedback não é da questão.** Número de
  tentativas, penalidade por envio e o que o aluno vê dos testes ocultos
  pertencem à prova ou ao host.

## Decisões

- **D1. Dois tipos: `code` e `project`.** Em `code`, o aluno entrega um único
  arquivo. `project` fica para o futuro e não é desenhado aqui.
- **D2. A nota sai de uma rubrica.** Cada item da rubrica é aplicado por
  testes ou, como exceção, à mão.
- **D3. O item ligado a testes é declarado no próprio fonte de testes**, em
  comentário com o marcador `mdq:`. Associar item e teste por nome, em dois
  lugares, foi descartado: o professor erra o nome.
- **D4. A ligação entre item e teste é por linha.** A anotação abre uma região
  que vai até a próxima anotação ou o fim do fonte. O runner informa a linha
  de cada caso e o MDQ encontra a região. Não depende de linguagem nem de
  framework.
- **D5. A rubrica manual fica em `## [rubric]`** (seção H2, como
  `## [answer-key]`), e todo item dela tem um vínculo explícito. Na v1 o único
  vínculo é `{manual}`. Item sem vínculo é erro.
- **D6. Os valores da rubrica são pontos relativos**, normalizados pela soma
  dos itens positivos. Valor omitido vale 1. Itens negativos usam a mesma
  unidade dos positivos. O professor muda o peso da questão com `weight` na
  prova, como em qualquer outro tipo. A nota bruta fica em `[-1, 1]`, ver F13.
- **D7. Sem anotação, cada fonte de testes é um item implícito de valor 1**, e
  os casos do fonte dividem o item em partes iguais.
- **D8. Os testes podem ficar no `.md` ou num arquivo externo.** O bloco
  cercado no `.md` é sempre possível e nunca obrigatório.
- **D9. Informação adicional de um fonte de testes vai num cabeçalho em
  comentário no próprio fonte**, não na info string nem no título do link.
  Funciona igual para bloco e para arquivo externo.
- **D10. `iospec` é um plugin**, não parte da spec. Incorporá-lo agora
  obrigaria a portá-lo para a mdq-js e prenderia a spec a esse formato.

## Formato mínimo (v1)

### Exemplo

`conta-de-luz.mdq.md`:

````md
---
type: code
language: python
file: conta.py
---
[conta-de-luz] A tarifa de energia é R$ 0,80 por kWh. A bandeira tarifária
soma um adicional por kWh: verde R$ 0,00, amarela R$ 0,02 e vermelha R$ 0,05.

Escreva a função `valor_conta(kwh, bandeira)`, que devolve o total em reais.

[code]

## [template]

```python
def valor_conta(kwh, bandeira):
    ...
```

## [tests]

[testes da função](test_conta.py)

## [rubric]

* [+2] {manual} Nomes de variáveis claros
  ! Não descontar por nomes em inglês

## [answer-key]

```python
ADICIONAL = {"verde": 0.00, "amarela": 0.02, "vermelha": 0.05}

def valor_conta(kwh, bandeira):
    return kwh * (0.80 + ADICIONAL[bandeira])
```
````

`test_conta.py`:

```python
import pytest
import solution
from conta import valor_conta

# mdq: [+3] {example} Acerta os exemplos do enunciado
def test_verde():
    assert valor_conta(100, "verde") == pytest.approx(80.00)

def test_amarela():
    assert valor_conta(150, "amarela") == pytest.approx(123.00)

# mdq: [+5] Correta para qualquer consumo e bandeira
# mdq: > Confira o adicional de cada bandeira.
@pytest.mark.parametrize("bandeira", ["verde", "amarela", "vermelha"])
@pytest.mark.parametrize("kwh", [0, 1, 37.5, 480, 10_000])
def test_contra_gabarito(kwh, bandeira):
    esperado = solution.valor_conta(kwh, bandeira)
    assert valor_conta(kwh, bandeira) == pytest.approx(esperado)

# mdq: [-2] Aceita bandeira que não existe
def test_bandeira_invalida():
    with pytest.raises((KeyError, ValueError)):
        valor_conta(100, "roxa")
```

Os positivos somam 10. Um aluno que passa em tudo, menos em
`test_bandeira_invalida`, tem `(3 + 5 - 2) / 10 = 0,6` automáticos e espera o
professor para os 2 pontos manuais.

### Elementos

**F1. Tipo e tag.** `type: code`. O corpo é um parágrafo só com `[code]`, sem
dois-pontos e sem conteúdo, como `[essay]`.

**F2. Frontmatter.** Dois campos novos, e nenhum outro na v1:

- `language`: a linguagem de programação da submissão. Opcional, qualquer
  string não vazia. O tipo `code` não tem `highlight`: o host deriva o realce
  de `language`. Não é comparado com o formato dos fontes de testes.
- `file`: o nome do arquivo da submissão, um nome simples, sem `/` nem `\`.
  Opcional: um teste de IO não precisa dele.

**F3. Resposta.** Uma string: o conteúdo do arquivo.

**F4. `## [tests]`.** Uma sequência de fontes de testes. Cada fonte é:

- um bloco cercado, cuja primeira palavra da info string é o formato; ou
- um parágrafo só com um link Markdown para um arquivo.

Regras do link:

- O formato é o texto depois do último `.` do último segmento do caminho, com
  maiúsculas e minúsculas preservadas, como na regra das cercas. `py` e
  `python` são dois formatos para o núcleo; cada runner declara os que aceita.
- Arquivo sem extensão é `parse-error`.
- O destino é um caminho relativo, sem esquema, sem query e sem fragmento (o
  fragmento fica reservado para E6).
- `load` e `parse` não leem o arquivo (ADR 0007). O fonte fica **não
  resolvido**, com `origin` e sem `text`. Um passo de resolução, como
  `Exam.resolve`, recebe um mapa de origem para texto e preenche `text`. A
  mdq-js não precisa de sistema de arquivos. Operações que precisam do texto
  (nota, lints da rubrica, forma pública) falham num fonte não resolvido.

O núcleo guarda `(format, text, origin)` e não interpreta o texto. Formato
desconhecido não é erro.

O host escolhe o runner pelo par (`language`, formato). Isso separa linguagens
com a mesma extensão: `language: prolog` com um arquivo `.pl` não é Perl.
Frameworks diferentes com a mesma extensão (pytest e unittest em `.py`) ficam
com a configuração do host na v1, ver E17.

**F5. Anotação `mdq:`.** Uma linha do fonte em que `mdq:` vem depois de zero
ou mais caracteres de pontuação ASCII, espaços e tabs. Cobre `#`, `//`, `--`,
`;`, `%`, `*`, `/*` e `<!--`. Uma letra ou um dígito antes do marcador, ASCII
ou não, torna a linha texto comum.

- `mdq:` é minúsculo e não aceita espaço antes dos dois-pontos.
- O resto da linha é um item de rubrica: valor opcional, modificadores
  opcionais, texto do critério.
- O texto vai até o fim da linha. Um fechamento de comentário de bloco (`*/`,
  `-->`) no fim da linha faz parte do texto: o autor usa comentário de linha
  ou põe o fechamento na linha seguinte.
- Feedback ao aluno (`mdq: >`) e comentário privado (`mdq: !`) vêm nas linhas
  logo abaixo. Cada linha precisa do próprio marcador, porque uma linha de
  código não pode ser linha de continuação.

Valor: `"[" ("+" | "-")? (INTEGER | DECIMAL) "]"`, sem espaço dentro dos
colchetes. `[3]` é igual a `[+3]`. Sem expoente e sem fração. É a forma de
`percent` da múltipla escolha, sem o `%`.

Modificadores: `("{" NAME "}" ws?)*`, um por par de chaves, depois do valor e
antes do texto. `NAME` é minúsculo. Nome desconhecido é erro. Uma `{` logo
depois do valor é sempre um modificador; um critério que começa com `{` usa
`\{`. `{public}` e `{example}` só valem num fonte de testes, e `{manual}` só
vale em `## [rubric]`: no lugar errado, é erro.

Id: um item não tem id na sintaxe da v1. Um item manual é identificado pela
posição em `## [rubric]`, e um item ligado a testes pelo fonte e pela linha da
anotação. O host copia a rubrica quando a correção começa, então editar o
documento depois não afeta as notas já dadas. Um critério que começa com
`[slug]` é erro: a posição fica reservada para o id explícito (E16), e um
texto que começa com um link de atalho usa `[texto][]`.

**F6. Região.** Vai da anotação até a próxima anotação de item ou o fim do
fonte. Um caso pertence à região que contém a linha onde ele está definido.
Num fonte com anotações, um caso fora de qualquer região roda e não pontua
(lint no nível info).

**F7. Modificador `{public}`.** O aluno vê os casos da região e pode rodá-los
antes da entrega, com resultado imediato. Sem `{public}`, o teste é oculto.
Com valor `[0]`, a região é uma pré-validação que não conta na nota, o mesmo
conceito de `preAccept`/`preReject` do short answer.

**F8. Modificador `{example}`.** Implica `{public}`. Além disso, o host mostra
os casos da região dentro do enunciado, para o professor não copiar os
exemplos para o texto. Sem um plugin do formato, o host mostra o texto da
região como bloco de código. Um plugin pode exibir melhor, por exemplo como
tabela de entrada e saída.

**F9. `## [rubric]`.** Uma lista de itens `* [valor] {manual} critério`, com
as linhas `>` e `!` dos itens de `choices`. Usa o mesmo valor e os mesmos
modificadores de F5. Depende da issue `rubrica-de-correcao`.

**F10. `## [answer-key]`.** Como no essay. A solução de referência é um valor
derivado: o primeiro bloco cercado da seção. O núcleo o extrai, para que todo
runner leia o mesmo bloco.

**F11. `## [template]`.** Uma seção com um bloco de código: o código inicial
que o aluno recebe no editor. Faz parte da forma pública.

**F12. Ordem das seções.** `## [template]`, `## [tests]` e `## [rubric]` vêm
em qualquer ordem, cada uma no máximo uma vez. `## [answer-key]`, quando
existe, é a última seção e mantém a regra do essay: vai até o fim da questão.
Um título `## [nome]` depois do `## [answer-key]` é erro, **em todo tipo de
questão**. Isso muda o essay, em que hoje esse título vira texto do gabarito
em silêncio; nenhum arquivo do corpus é afetado. A checagem olha a linha da
fonte, então `## \[x]` continua sendo um título literal.

**F13. Nota.** Para cada item ligado a testes, com `n` casos e `p` aprovados:

- item positivo de valor `v`: ganha `v × p / n`;
- item negativo de valor `-v`: desconta `v × (n - p) / n`.

A nota bruta é `max(-1, (ganhos - descontos) / soma dos positivos)`, na
faixa `[-1, 1]` de toda questão. A `penalty` da prova decide o resto, como
numa múltipla escolha: com o padrão `"none"`, a questão nunca fica abaixo
de 0. `docs/exam.md` ganha uma frase explícita, porque hoje diz que a questão
nunca limita a própria nota e que os tipos sem `grading` pontuam em `[0, 1]`.

Num item manual, a nota do professor em `[0, 1]` é a fração do valor ganha
(item positivo) ou a fração do desconto aplicada (item negativo). Enquanto um
item manual está pendente, a resposta não tem nota (`docs/responses.md`).

**F14. Automation.** Derivada, como nos outros tipos: sem testes, `manual`;
só itens ligados a testes, `automatic`; os dois, `semi-automatic`.

**F15. Forma JSON.**

- `tests`: lista de `{format, text, origin}`. `origin` é o destino do link e
  não existe num bloco cercado. `text` não existe num fonte não resolvido.
- `rubric`: só os itens manuais. Os itens ligados a testes ficam nas
  anotações de cada `text`. A rubrica completa é um valor derivado, como
  `automation`.
- `template` e `answerKey`: strings Markdown.

**F16. Forma pública.**

- `tests`, `rubric` e `answerKey` são privados. O que o aluno vê da rubrica e
  quando é política do host (P5).
- A forma pública ganha uma lista derivada com uma entrada por região
  `{public}` ou `{example}`: `{format, text, firstLine, example}`.
- O texto de uma região pública serve para exibir. Ele não tem os imports que
  vêm antes da primeira anotação, e o runner sempre roda o fonte inteiro.
- `template`, `language` e `file` são públicos.

**F17. Entrada do runner.** A spec não fixa nada. A entrada de um runner é a
forma JSON privada da questão mais a string da resposta. Como o teste alcança
a submissão e a solução de referência é convenção do plugin do formato. No
exemplo acima, `import solution` e `from conta import ...` são convenções de
um plugin de pytest hipotético, não da spec.

## Relatório do runner

Um JSON com schema em `schema/` e um documento próprio em `docs/`. Não fica
em `docs/responses.md`, que declara que respostas não têm schema: o relatório
é produzido por projetos de terceiros, então precisa de um.

Da execução:

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `status` | sim | `completed`, `build-error` ou `runner-error` |
| `cases` | sim | lista de casos |
| `build` | não | mensagem do compilador ou do erro de sintaxe |
| `runner` | não | nome, versão, linguagem e versão do toolchain |
| hashes | não | da submissão e dos fontes de testes |

De cada caso:

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `source` | sim | de qual fonte de testes o caso veio |
| `line` | sim | linha, no fonte, onde o caso está definido |
| `verdict` | sim | `pass`, `fail`, `error`, `timeout`, `resource-limit`, `skipped` |
| `id` | não | nome para exibição (`test_verde`, `test_x[3]`) |
| `message` | não | mensagem curta |
| `expected`, `actual` | não | para o diff |
| `stdout`, `stderr` | não | com marca de truncado |
| `duration`, `memory` | não | |

Regras:

- `runner-error` é falha de infraestrutura: a resposta fica pendente, nunca
  vale zero.
- `build-error`: todos os itens ligados a testes contam como falhos. Os itens
  manuais continuam valendo.
- Um caso é binário. O runner não devolve pontuação.

## Pontos de extensão

Nada aqui entra na v1. O formato mínimo não pode impedir nenhum deles.

- **E1. Formatos de teste como plugin.** `iospec` para IO (com os ajustes:
  sem `@command`/`@import`, entrada gerada dentro de `<...>`, blocos de erro
  só como resultado) e uma DSL de testes unitários simples. Cada um pode ser
  incorporado à spec depois.
- **E2. Interface de plugin** no mdq-py: validação adicional de um fonte,
  listar casos sem submissão (`discover`), rodar o gabarito contra os testes
  (`check`), resolver saídas esperadas a partir do gabarito. A mdq-js não
  precisa de plugin: mostra a questão e converte relatório em nota.
- **E3. Várias linguagens.** Vários blocos ou links, um por linguagem,
  escolhidos na hora do teste. Ideia: o mesmo item declarado em dois fontes é
  um item só, e o lint exige o mesmo valor nos dois.
- **E4. Testes numa linguagem que aceitam submissão em outra** (teste em
  Python, submissão em C, com bindings automáticos). O cabeçalho em comentário
  de D9 declara as linguagens aceitas e as informações de binding.
- **E5. Outras análises na rubrica**: linter, formatador, verificador de
  tipos. Um analisador produz casos como os testes, com uma lista de
  `findings` (código, mensagem, linha na submissão). O vínculo seria
  `{lint}` ou `{nome: argumentos}` em `## [rubric]`. Checagem estrutural
  ("usa recursão", "não usa `for`") já cabe na v1 como teste que lê o fonte
  da submissão.
- **E6. Região de arquivo externo** pelo fragmento do link
  (`test_conta.py#regiao`), para um arquivo só trazer testes, gabarito e
  código inicial.
- **E7. Limites** de tempo e memória declarados na questão.
- **E8. Fim de região explícito** (`mdq: end`).
- **E9. Desconto por ocorrência** em analisadores, com teto.
- **E10. Pontuação parcial por caso** (campo `score` no relatório).
- **E11. Política de tentativas e de feedback** na prova: tentativas,
  penalidade por envio, visibilidade dos testes ocultos. Outro RFC.
- **E12. Tipo `project`**: vários arquivos, comandos de build.
- **E13. Modo bloqueante** de pré-validação: a entrega é recusada enquanto um
  teste público falhar.
- **E14. Documento de entrada do runner** (um JSON de "job", simétrico ao
  relatório), se os plugins convergirem para uma forma comum.
- **E15. Lint para fechamento de comentário de bloco** no fim de uma anotação
  (`*/`, `-->`).
- **E16. Id explícito de item de rubrica**, opcional e entre colchetes, como
  o de um choice.
- **E17. Formato explícito de um fonte de testes**, no cabeçalho em
  comentário (`# mdq: {format: pytest}`), para frameworks que dividem a mesma
  extensão.

## Comitê de 2026-11-10

Os pontos em aberto da primeira versão deste RFC foram a um comitê de três
votos (lead, CommonMark, Simplista), em duas rodadas. Os votos estão em
`/tmp/committee/code-rfc/votes/`. O resultado unânime já está nos elementos
F2, F4, F5, F10, F12, F15, F16 e F17.

Decididos pelo lead por serem detalhes (2 a 1, e a minoria aceita):

- Sem espaço dentro dos colchetes do valor (CommonMark queria `ws?`, como no
  marcador de choice).
- Sem lint para fechamento de comentário de bloco na v1 (CommonMark queria o
  lint; virou E15).
- O campo se chama `file`: os três votaram em nomes diferentes (`file`,
  `filename`, `submissionFile`) e os três aceitam `file`.

Decididos pelo humano depois do comitê (2 a 1 nos três, CommonMark na
minoria):

- Nenhum id de item na v1 (F5). A minoria queria id opcional entre colchetes.
- Piso da nota em -1 (F13). A minoria queria nota sem piso e erro de
  documento quando os negativos somam mais que os positivos.
- `file` é opcional (F2). A minoria queria obrigatório com `## [tests]`.

## Ajustes na escrita da spec (2026-11-10)

Pontos em que a spec difere do texto acima, ou o completa:

- **F4.** Num fonte não resolvido, a nota e a forma pública falham. Os lints
  que precisam do texto não reportam nada: um lint não tem como falhar.
- **F6.** O caso fora de toda região não é lint de documento: só se conhece a
  linha de um caso com o relatório. É um fato da correção.
- **E8.** `# mdq: end` é um item válido na v1 (valor 1, critério "end"). O fim
  de região explícito deve usar uma sintaxe que a v1 rejeita, como o
  modificador `{end}`, para um leitor v1 dar erro em vez de nota errada.
- **A1.** O campo derivado da forma pública se chama `publicTests`.
- **Relatório.** Ganhou um `message` opcional, para o `runner-error`.

## Comitê da spec (2026-11-10)

A revisão da spec deixou 12 pontos de desenho. Foram a um segundo comitê
(lead, CommonMark, Simplista) e fecharam unânimes em duas rodadas:

- **Título no answer-key (F12).** Dentro do `## [answer-key]` vale a mesma
  regra do epílogo: título de qualquer nível que começa com `[` é erro, salvo
  as três formas de link. É mais largo que o F12 (`### [1] Critério` também é
  erro); o autor escreve `\[`.
- **`code` é rótulo reservado**, como todo nome de tipo. `[code]: x` dá a
  mensagem de `[essay]:`.
- **`skipped` não aprova.** O runner que não conseguiu rodar um caso por
  motivo próprio reporta `runner-error`.
- **Schema do relatório**: fechado, com `version` inteiro opcional (ausente
  = 1; desconhecido = `ReportError`) e `meta` aberto na raiz e no caso.
- **Resolução**: a origem é chave opaca, comparada como string, sem
  normalização. O passo e o mapa são por questão. Origem ausente do mapa
  fica não resolvida.
- **Região pública**: aparada nas duas pontas; `firstLine` é a primeira
  linha não vazia; região sem linha não vazia não gera entrada.
- **`template`**: exatamente um bloco cercado, em toda forma do documento.
- **Critério que começa com `[`** é erro, salvo link. Substitui a regra do
  `[slug]` do F5 e pega `[ 3 ]`, `[50%]`, `[3,5]`.
- **Dois links no mesmo parágrafo** de `## [tests]` continuam erro.
- **Item sem caso no relatório** não ganha nem desconta.

## Em aberto

Nada.

Os termos novos estão no `GLOSSARY.md` (tag `code`).
