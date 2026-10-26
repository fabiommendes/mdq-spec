---
type: issue
status: open
tags: [mdq-py, render, frontmatter, yaml]
relatedTo: [mdq-py-test-suite-slim]
---

# Render do frontmatter escapa caracteres não ASCII

`_parser._frontmatter.dump_yaml` chama `yaml.dump` sem `allow_unicode=True`.
`OrderingQuestion(title="Ciclo da água", ...).render()` escreve
`title: "Ciclo da \xE1gua"`. A releitura dá o mesmo valor, mas o texto não é o
que um autor escreve. Provável correção: `allow_unicode=True` em `dump_yaml`,
mais um teste de render com título acentuado.
