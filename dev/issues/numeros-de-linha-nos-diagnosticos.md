---
type: issue
status: backlog
tags: [mdq-py, diagnostics, parser]
kind: enhancement
created: 2026-11-04
creator: claude
---

# Números de linha nos diagnósticos

Do `BACKLOG.md` (migrado em 2026-11-04). Precisa de design antes de implementar.

Hoje um `Diagnostic` tem `path`, mas não a linha da fonte. Proposta: o parser
registra um mapa `path -> linha` enquanto monta o documento a partir do
Markdown (`node.map`), e todo diagnóstico com `path` (modelo ou lint) ganha a
linha. Para YAML, percorrer a árvore de `yaml.compose()` (`start_mark.line`).

Investigar antes: casos de canto do PyYAML lendo JSON (JSON não é subconjunto
estrito de YAML) e parsers JSON existentes que já guardam posições. Escrever um
parser JSON próprio é aceitável; um parser YAML, não.
