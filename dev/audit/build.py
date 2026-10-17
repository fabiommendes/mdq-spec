"""Build report.html from spec.html, examples.html and the findings-*.md files."""

import html
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).parent
SLICES = {
    "findings-choices.md": "multiple-choice, multiple-selection, true-false, grading",
    "findings-text.md": "short-answer, fill-in",
    "findings-numeric-ordering.md": "numeric, ordering",
    "findings-essay-base.md": "essay e campos comuns",
    "findings-exam-invalid.md": "exam e invalid",
}
STYLE = """
body{font:15px/1.45 system-ui,sans-serif;max-width:1200px;margin:2em auto;padding:0 1em;color:#222}
table{border-collapse:collapse;width:100%;margin:1em 0}
td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top;text-align:left}
th{background:#eee}
code{background:#f0f0f0;padding:0 3px}
pre{background:#f7f7f7;padding:1em;overflow:auto;white-space:pre-wrap;font-size:13px}
.a{color:#b00020}.m{color:#b26a00}.b{color:#555}
td:nth-child(1),td:nth-child(2){white-space:nowrap}
"""


def fragment(name: str) -> str:
    path = HERE / name
    return path.read_text() if path.exists() else ""


def raw_findings() -> str:
    parts = []
    for name, label in SLICES.items():
        path = HERE / name
        if path.exists():
            body = f"<pre>{html.escape(path.read_text())}</pre>"
        else:
            body = "<p><i>agente ainda rodando</i></p>"
        parts.append(f"<details><summary><b>{label}</b> ({name})</summary>{body}</details>")
    return "\n".join(parts)


def main() -> None:
    done = sum((HERE / name).exists() for name in SLICES)
    status = "completo" if done == len(SLICES) else f"em andamento ({done}/{len(SLICES)} agentes concluídos)"
    page = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>MDQ: auditoria de spec e exemplos</title>
<meta http-equiv="refresh" content="60"><style>{STYLE}</style></head><body>
<h1>MDQ: auditoria de spec e exemplos</h1>
<p><b>Status:</b> {status}. Atualizado em {datetime.now():%Y-%m-%d %H:%M}. Rascunho.</p>
{fragment("summary.html")}
{fragment("spec.html")}
{fragment("examples.html")}
<h2 id="raw">Anexo: achados brutos dos agentes</h2>
{raw_findings()}
</body></html>"""
    (HERE / "report.html").write_text(page)


if __name__ == "__main__":
    main()
