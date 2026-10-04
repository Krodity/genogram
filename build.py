#!/usr/bin/env python3
"""Inline style.css, app.js and the vendored PDF libraries into dist/Genogram.html.

The result is one self-contained file: no server, no internet, no web fonts.
Double-click it on any Mac/PC and it opens in the default browser.
"""
import pathlib, re

root = pathlib.Path(__file__).parent
html = (root / "index.html").read_text()

def inline_js(name):
    code = (root / name).read_text()
    assert "</script" not in code.lower(), f"{name} contains </script"
    return f"<script>\n{code}\n</script>"

html = re.sub(r'\s*<link rel="preconnect"[^>]*>', "", html)
html = re.sub(r'\s*<link rel="stylesheet" href="https://fonts[^>]*>', "", html)
html = html.replace('<link rel="stylesheet" href="style.css">',
                    "<style>\n" + (root / "style.css").read_text() + "\n</style>")
for src in ("vendor/jspdf.umd.min.js", "vendor/svg2pdf.umd.min.js", "app.js"):
    tag = f'<script src="{src}"></script>'
    assert tag in html, tag
    html = html.replace(tag, inline_js(src))

out = root / "dist" / "Genogram.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
