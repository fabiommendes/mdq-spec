"""Build dev/audit2/report.html from the findings files. Run: python3 dev/audit2/build_report.py"""
import html, re, glob, datetime, pathlib

ROOT = pathlib.Path(__file__).parent
AREAS = [
    ("findings-schema-base.md", "Schema e regras base"),
    ("findings-choices.md", "Multiple choice / multiple selection (+ base)"),
    ("findings-true-false-essay.md", "True/false e essay"),
    ("findings-numeric.md", "Numeric"),
    ("findings-short-answer.md", "Short answer e patterns"),
    ("findings-fill-in.md", "Fill in the blanks"),
    ("findings-ordering.md", "Ordering"),
    ("findings-exam.md", "Exam"),
]

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"``\s?(.+?)\s?``", r"<code>\1</code>", s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    return s

def md_to_html(text):
    out, i, lines = [], 0, text.split("\n")
    # strip frontmatter
    if lines and lines[0] == "---":
        j = lines.index("---", 1); lines = lines[j+1:]
    in_ul = False; in_para = []
    def flush_para():
        nonlocal in_para
        if in_para:
            out.append("<p>" + inline(" ".join(in_para)) + "</p>"); in_para = []
    def close_ul():
        nonlocal in_ul
        if in_ul: out.append("</ul>"); in_ul = False
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("```") or ln.startswith("````"):
            flush_para(); close_ul()
            fence = ln[:4] if ln.startswith("````") else "```"
            buf = []; i += 1
            while i < len(lines) and not lines[i].startswith(fence):
                buf.append(lines[i]); i += 1
            out.append("<pre>" + html.escape("\n".join(buf)) + "</pre>"); i += 1; continue
        if re.match(r"^\s{4,}\S", ln) and not in_ul and not in_para:
            buf = []
            while i < len(lines) and (re.match(r"^\s{4,}", lines[i]) or lines[i].strip() == ""):
                buf.append(lines[i][6:] if lines[i].startswith("      ") else lines[i].strip()); i += 1
            out.append("<pre>" + html.escape("\n".join(buf).strip("\n")) + "</pre>"); continue
        m = re.match(r"^(#{1,6})\s+(.*)", ln)
        if m:
            flush_para(); close_ul()
            lvl = len(m.group(1)) + 1
            sev = re.search(r"\((?:severity: )?(high|medium|low)\)", m.group(2))
            cls = f' class="sev-{sev.group(1)}"' if sev else ""
            out.append(f"<h{lvl}{cls}>{inline(m.group(2))}</h{lvl}>"); i += 1; continue
        if ln.startswith("|"):
            flush_para(); close_ul()
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                if not set("".join(cells)) <= set("-: "): rows.append(cells)
                i += 1
            out.append("<table>" + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rows) + "</table>"); continue
        m = re.match(r"^(\s*)[-*]\s+(.*)", ln)
        if m:
            flush_para()
            if not in_ul: out.append("<ul>"); in_ul = True
            depth = len(m.group(1)) // 2
            item = m.group(2)
            # gather continuation lines indented deeper
            i += 1
            while i < len(lines) and lines[i].strip() and not re.match(r"^\s*[-*]\s+", lines[i]) and not lines[i].startswith("#") and not lines[i].startswith("|") and not lines[i].startswith("```"):
                item += " " + lines[i].strip(); i += 1
            sev = re.search(r"\((high|medium|low)\)", item)
            cls = f' class="sev-{sev.group(1)}"' if sev else ""
            out.append(f'<li style="margin-left:{depth*1.2}em"{cls}>{inline(item)}</li>'); continue
        if ln.strip() == "":
            flush_para(); close_ul(); i += 1; continue
        close_ul(); in_para.append(ln.strip()); i += 1
    flush_para(); close_ul()
    return "\n".join(out)

def counts(text):
    sev = re.findall(r"\((?:severity: )?(high|medium|low)\)", text)
    return {s: sev.count(s) for s in ("high", "medium", "low")}

THEMES = (ROOT / "themes.md").read_text(encoding="utf-8")
sections, rows, tot = [], [], {"high": 0, "medium": 0, "low": 0}
for fn, title in AREAS:
    text = (ROOT / fn).read_text(encoding="utf-8")
    c = counts(text)
    for k in tot: tot[k] += c[k]
    aid = fn.replace(".md", "")
    rows.append(f'<tr><td><a href="#{aid}">{title}</a></td><td>{c["high"]}</td><td>{c["medium"]}</td><td>{c["low"]}</td><td>{sum(c.values())}</td></tr>')
    sections.append(f'<section id="{aid}"><hr>{md_to_html(text)}</section>')

CSS = """
body{font-family:system-ui,sans-serif;max-width:62em;margin:2em auto;padding:0 1em;line-height:1.45;color:#222}
code{background:#f3f3f3;padding:0 .2em;border-radius:3px;font-size:.92em}
pre{background:#f6f6f6;padding:.7em;overflow-x:auto;border-left:3px solid #ccc}
table{border-collapse:collapse;margin:.6em 0}td,th{border:1px solid #ccc;padding:.25em .6em;vertical-align:top}
h1{border-bottom:2px solid #333}h2{margin-top:2em;border-bottom:1px solid #999}h3{margin-top:1.6em}
h4{margin:1.3em 0 .3em;padding-left:.4em;border-left:5px solid #bbb}
.sev-high{border-left-color:#c0392b}.sev-medium{border-left-color:#e67e22}.sev-low{border-left-color:#7f8c8d}
li.sev-high{list-style:none;border-left:5px solid #c0392b;padding-left:.5em;margin-top:.5em}
li.sev-medium{list-style:none;border-left:5px solid #e67e22;padding-left:.5em;margin-top:.5em}
li.sev-low{list-style:none;border-left:5px solid #7f8c8d;padding-left:.5em;margin-top:.5em}
nav a{margin-right:1em}.toc li{margin:.15em 0}
"""
doc = f"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Auditoria 2 do spec MDQ</title><style>{CSS}</style></head><body>
<h1>Auditoria independente do spec MDQ (rodada 2)</h1>
<p>Data: {datetime.date.today().isoformat()}. Fontes: <code>docs/</code>, <code>examples/</code>, <code>schema/</code>. Nenhum auditor leu <code>dev/audit</code>, handoffs ou as implementações.</p>
<table><tr><th>Área</th><th>high</th><th>medium</th><th>low</th><th>total</th></tr>{"".join(rows)}
<tr><th>Total</th><th>{tot["high"]}</th><th>{tot["medium"]}</th><th>{tot["low"]}</th><th>{sum(tot.values())}</th></tr></table>
{md_to_html(THEMES)}
<h2>Achados por área (íntegra)</h2>
{"".join(sections)}
</body></html>"""
(ROOT / "report.html").write_text(doc, encoding="utf-8")
print("report.html", len(doc), "bytes; totals", tot)
