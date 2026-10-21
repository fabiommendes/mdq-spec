---
type: issue
status: open
tags: [mdq-py, conversores, fill-in]
relatedTo: [mdq-py/mdq/convert/_moodle_xml.py, dev/audits/decisoes-fill-in-2026-10-20.md]
---

# Export Moodle troca `[^id]` dentro de código

`mdq-py/mdq/convert/_moodle_xml.py:82` (`BLANK_MARKER_REGEX`) troca todo `[^id]` do stem cru pelo blank do Moodle, inclusive dentro de code span, código cercado e `[^x](url)`.

Pela decisão D1b da auditoria de fill-in, código é texto literal e `[^x](url)` é link. O conversor deveria usar `mdq._markdown.find_blank_markers` (ou percorrer os tokens) em vez do regex.
