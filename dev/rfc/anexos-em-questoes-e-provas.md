---
type: rfc
status: accepted
tags: [spec, attachments]
created: 2026-11-11
decided: 2026-11-11
creator: claude
---

# Anexos em questões e provas

## Problema

Uma questão, ou uma prova, não tem como declarar arquivos que o aluno baixa:
dados de entrada, um enunciado em PDF, um arquivo-base para editar. Hoje o
autor coloca um link solto no enunciado, que o MDQ não vê como anexo e que não
tem nome nem forma definida na forma pública.

## Proposta

Uma seção nova, `## [attachments]`, comum a todos os tipos de questão e também
à prova.

````md
## [attachments]

[dados de consumo](dados/consumo-2024.csv)

```python conta_base.py
def valor_conta(kwh, bandeira):
    ...
```
````

### Decisões já tomadas (conversa de 2026-11-11)

- **Público.** Um anexo é para o aluno: vai para a forma pública. Ele não é
  fixture do runner. Se um dia o runner precisar de arquivos de apoio, isso
  vira uma decisão do tipo `code`, não desta seção.
- **Binários só por link.** Um link fica sem resolver e o host serve o arquivo.
  O mapa de resolução continua só com texto. Um PDF ou uma imagem nunca entra
  no JSON.
- **Nome do anexo.** É sempre um nome de arquivo, sem diretório.
  - Num fenced block, é a segunda palavra do info string:
    ` ```python conta_base.py `. A primeira palavra é sempre a linguagem (ou o
    formato). Um bloco só com ` ```conta_base.py ` é ambíguo e não é aceito.
  - Num link, o origin pode ter diretório (`dados/consumo-2024.csv`), mas o
    nome do anexo é o último segmento (`consumo-2024.csv`).
- **Prova.** A prova também tem `## [attachments]`, numa seção antes de todas
  as questões. Depois da última questão, seria ambíguo: a seção seria da prova
  ou da última questão?

### Reaproveitamento de `[tests]`

`## [tests]` do tipo `code` já define o parágrafo de link (`link_paragraph`),
o origin como chave opaca, o link não resolvido e o passo de resolução
(`docs/question-types/code.md`, "Test sources"). A seção nova usa as mesmas
regras. Hoje um fenced block de `[tests]` não tem nome; o pytest precisa
importar `test_conta.py` por um nome, então a regra do nome no info string deve
ser definida uma vez em `docs/question-types/question-base.md` e valer também
para `[tests]`.

## Pontos em aberto (para o comitê de spec)

1. **Resto do info string.** Depois do nome, mais texto é `parse-error`
   (reserva espaço para atributos)? E se o nome tiver espaço?
2. **Forma do nome no fenced block.** Mesmas regras do `file` do tipo `code`
   (sem `/`, sem `\`, sem `.`/`..`, não vazio)?
3. **Nomes repetidos.** Dois anexos com o mesmo nome, inclusive dois links
   `a/x.csv` e `b/x.csv`, dão erro? Qual código?
4. **Ordem das seções na questão.** É a primeira seção comum a todos os tipos.
   Ela vem antes de `## [answer-key]`, que engole tudo até o fim. Em qualquer
   ordem com as seções do tipo, ou sempre a primeira?
5. **Seção na prova.** As instruções da prova aceitam `H2` hoje. Um
   `## [attachments]` entre as instruções e a primeira questão muda o sentido
   de uma prova que já tinha esse heading literal. Escape com `## \[attachments]`?
6. **Texto do link.** Em `[tests]` o texto é ignorado. Num anexo ele pode ser
   o rótulo que o aluno vê. Campo `label`?
7. **Forma JSON.** Algo como `{name, format, text?, origin?, label?}`. O
   `format` do link vem da extensão, como em `[tests]`. Arquivo sem extensão é
   aceito num anexo (ao contrário de `[tests]`)?
8. **Include da prova.** Um anexo de uma questão incluída por `include` aponta
   para um origin relativo ao arquivo da questão. A resolução por questão de
   `[tests]` já cobre isso?
9. **Forma pública.** Um anexo não resolvido falha a forma pública (como um
   teste) ou segue só com `origin`, já que o host serve o arquivo? Pela decisão
   dos binários, a segunda opção.

---
by: claude

Decisões do comitê (lead, CommonMark, Simplista) e do humano, implementadas na spec e no mdq-py em 2026-11-11:

- Fence com info string `formato nome`, exatamente duas palavras. Link: o nome é o último segmento do origin. O link precisa de extensão.
- Nome: regra do `file` do code, mais sem espaço Unicode e sem crase, também no link. Nome repetido é o erro `duplicate-attachment-name`.
- JSON: `{name, format, text | origin, label?}`. O `label` vem do texto do link, em texto puro. Novos erros `attachment-name-disagrees-with-origin` e `attachment-format-disagrees-with-origin`.
- Posição: numa questão, em qualquer ordem com as seções do tipo. Na prova, entre as instruções e a primeira questão. Só `attachments` é reservado nas instruções da prova.
- O humano decidiu, na mesma mudança: `## [answer-key]` deixa de ser a última seção e termina no próximo heading de seção do tipo.
- Link nunca é resolvido. A forma pública tira o `origin`. A forma pública da prova continua indefinida.
- `## [tests]` não muda: issue `resto-do-info-string-de-tests-se-perde-no-round-trip`.
- Port no mdq-js: issue `mdq-js-porte-de-anexos-e-da-posicao-livre-do-answer-key`.
