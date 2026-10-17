"""Extract the final report of a sub-agent transcript into a findings file."""
import json, sys
src, dst = sys.argv[1], sys.argv[2]
last = None
for line in open(src):
    try:
        o = json.loads(line)
    except Exception:
        continue
    m = o.get("message") or {}
    if m.get("role") != "assistant":
        continue
    c = m.get("content")
    t = "".join(x.get("text", "") for x in c if x.get("type") == "text") if isinstance(c, list) else (c or "")
    if "### Example mismatches" in t:
        last = t
i = last.find("---\ntype: note")
t = last[i:].replace("&gt;", ">").replace("&lt;", "<")
j = t.find("\n```\n\nPoints for the caller")
if j > 0:
    t = t[:j]
open(dst, "w").write(t)
print(dst, len(t))
