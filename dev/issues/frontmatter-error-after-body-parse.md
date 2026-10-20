---
type: issue
status: open
tags: [mdq-py, diagnósticos, frontmatter]
relatedTo: [docs/question-types/question-base.md]
---

# Erro de frontmatter só aparece se o corpo for válido

Um `.mdq.md` com chave inválida no frontmatter (`invalid-frontmatter-field`) e
corpo com `parse-error` só reporta o `parse-error`. Corrigido o corpo, o erro
do frontmatter aparece numa segunda rodada. O mdq-py deveria validar o
frontmatter antes (ou junto) e reportar os dois.
