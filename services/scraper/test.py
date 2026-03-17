#!/usr/bin/env python3
"""Quick CLI test: python test.py [URL]"""
import os, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from app.selectors import get_selector_for_url

url = sys.argv[1] if len(sys.argv) > 1 else "https://www.chefkoch.de/rezepte/1170311223132029/Hackbraten-supersaftig.html"
sel = get_selector_for_url(url)
print(f"{url}\n  selector: {sel}\n" + "-" * 50)

out = tempfile.mktemp(suffix=".md")
try:
    r = subprocess.run(["scrapling", "extract", "stealthy-fetch", url, out, "-s", sel, "--timeout", "30000"],
                       capture_output=True, text=True)
    if r.returncode == 0:
        c = open(out, encoding="utf-8").read()
        print(f"OK ({len(c)} chars)\n{c[:800]}{'...' if len(c) > 800 else ''}")
    else:
        print(f"Error: {r.stderr}")
finally:
    os.path.exists(out) and os.unlink(out)
