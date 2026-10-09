"""Static regression checks; run with python -I tools/verify-site.py."""
import argparse
import hashlib
import json
import struct
import subprocess
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
COMMIT = "08b3642167063678b7674a37c248f7716c351002"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.nodes = []
        self.stack = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        node = {"tag": tag, "attrs": dict(attrs), "parent": self.stack[-1] if self.stack else None, "text": ""}
        self.nodes.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.stack.pop()

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        for node in self.stack:
            node["text"] += data

    def find(self, tag=None, **attrs):
        return [n for n in self.nodes if (tag is None or n["tag"] == tag) and all(
            set(v.split()).issubset(n["attrs"].get(k, "").split()) if k == "class" else n["attrs"].get(k) == v
            for k, v in attrs.items()
        )]


def check(condition, description):
    if not condition:
        raise AssertionError(description)
    print("PASS:", description)


def under(node, element_id):
    while node:
        if node["attrs"].get("id") == element_id:
            return True
        node = node["parent"]
    return False


def css_from(doc):
    styles = doc.find("style")
    check(len(styles) == 1, "one inline stylesheet")
    return styles[0]["text"]


def local_path(url):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc or url.startswith("#"):
        return None
    path = unquote(parsed.path).lstrip("/")
    return ROOT / (path or "index.html")


def is_original_asset(path):
    return path.startswith(("fonts/", "img/galerija/")) or path in ("favicon.svg", "favicon.ico", "apple-touch-icon.png", "icon-192.png")


def verify_original_assets(check_upstream):
    manifest = json.loads((ROOT / "tools/original-assets.json").read_text(encoding="utf-8"))
    assets = manifest["assets"]
    check(manifest["commit"] == COMMIT and len(assets) == 38, "pinned reference manifest contains 38 assets")
    check(all(is_original_asset(path) and (ROOT / path).resolve().is_relative_to(ROOT) for path in assets), "reference paths remain inside the site")
    for path, expected in assets.items():
        data = (ROOT / path).read_bytes()
        git_hash = hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()
        check(len(data) == expected["size"] and git_hash == expected["sha"], f"original asset byte-identical: {path}")
    if check_upstream:
        request = urllib.request.Request(f"https://api.github.com/repos/optikamila/optikamila.github.io/git/trees/{COMMIT}?recursive=1", headers={"User-Agent": "OptikaMilaLocalReview/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            tree = json.load(response)
        check(not tree.get("truncated"), "upstream inventory is complete")
        reference = {entry["path"]: {"sha": entry["sha"], "size": entry["size"]} for entry in tree["tree"] if entry["type"] == "blob" and is_original_asset(entry["path"])}
        check(assets == reference, "local reference manifest matches immutable upstream commit")
    return len(assets)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check-upstream", action="store_true", help="also compare the local manifest with the public GitHub API")
    args = parser.parse_args()
    texts = {name: (ROOT / name).read_text(encoding="utf-8") for name in ("index.html", "404.html")}
    docs = {name: Document(text) for name, text in texts.items()}
    index = docs["index.html"]
    ids = {n["attrs"]["id"] for n in index.nodes if "id" in n["attrs"]}
    for name, doc in docs.items():
        all_ids = [n["attrs"]["id"] for n in doc.nodes if "id" in n["attrs"]]
        check(len(all_ids) == len(set(all_ids)), f"{name}: unique IDs")
        check(doc.find("html", lang="sr-Latn"), f"{name}: Serbian Latin language")
        check(not any(token in texts[name] for token in ("{{STYLES}}", "{{BRAND_MARK}}", "{{SCRIPT_VERSION}}", "{{NAVIGATION_SCRIPT}}")), f"{name}: expanded template")
        for node in doc.nodes:
            attrs = node["attrs"]
            for attr in ("src", "href"):
                url = attrs.get(attr, "")
                if not url:
                    continue
                if url.startswith("#"):
                    check(url[1:] in set(all_ids), f"{name}: anchor {url}")
                elif url.startswith("/#"):
                    check(url[2:] in ids, f"{name}: home anchor {url}")
                else:
                    path = local_path(url)
                    if path:
                        check(path.is_file(), f"{name}: local resource {url}")
            if "srcset" in attrs:
                for candidate in attrs["srcset"].split(","):
                    path = local_path(candidate.strip().split()[0])
                    check(path is not None and path.is_file(), f"{name}: srcset {path.name}")
        version = hashlib.sha256((ROOT / "js/script.js").read_bytes()).hexdigest()[:12]
        check(doc.find("script", src=f"/js/script.js?v={version}"), f"{name}: current script hash")

    navigation = index.find("script", id="navigation-init")
    check(len(navigation) == 1 and "src" not in navigation[0]["attrs"], "one inline navigation initializer")
    check(navigation[0]["text"].strip() == (ROOT / "src/navigation.js").read_text(encoding="utf-8").strip(), "inline navigation matches its source")
    check(texts["index.html"].index('id="navigation-init"') < texts["index.html"].index('<main id="main"'), "navigation initializes before main is parsed")
    check(not docs["404.html"].find("script", id="navigation-init"), "404 has no unnecessary navigation initializer")
    check("nav-ready" not in (ROOT / "js/script.js").read_text(encoding="utf-8"), "deferred script does not initialize navigation twice")
    check(all("clsProbe" not in text and "layout-shift" not in text for text in texts.values()), "no CLS test instrumentation in production pages")

    sections = [n["attrs"].get("id") for n in index.find("section") if n["parent"] and n["parent"]["tag"] == "main"]
    check(sections == ["o-nama", "van-foce", "usluge", "arhiva", "kontakt"], "regional visits immediately after introduction")
    check(index.find("a", **{"class": "brand", "href": "#o-nama"}), "logo targets non-sticky introduction")
    check(not [n for n in index.find("img") if under(n, "o-nama")], "no hero photograph")
    towns = [n["text"].strip() for n in index.find("li") if under(n, "van-foce")]
    check(towns == ["Nevesinje", "Rogatica", "Gacko"], "all three towns retained")
    region = index.find("section", id="van-foce")[0]
    check("jednom mjesečno" in region["text"].casefold(), "monthly visits retained")
    gallery = [n for n in index.find("img") if under(n, "arhiva")]
    check(len(gallery) == 10, "ten archival photographs")
    for image in gallery:
        a = image["attrs"]
        check(a.get("loading") == "lazy" and a.get("width") == "480" and a.get("height") == "360" and bool(a.get("alt")), "archival image dimensions, lazy loading and alt")
        check(a.get("sizes") == "auto, (max-width:520px) 40vw, (max-width:980px) 180px, 190px", "native automatic image sizing with explicit fallback")
    check("hidden" in index.find("button", **{"class": "nav-toggle"})[0]["attrs"], "no inactive menu button before initialization")
    check(index.find("button", **{"class": "lightbox-retry"}), "retry control for failed image")
    check(index.find("p", **{"class": "lightbox-message", "role": "status"}), "accessible gallery status")
    check(len(index.find("h1")) == 1, "one primary heading")
    check(" ".join(index.find("dd", **{"class": "hero-hours"})[0]["text"].split()) == "Pon–pet 09:00–16:00 Subota 09:00–14:00", "opening hours retain text separators")

    css = css_from(index)
    check(css == css_from(docs["404.html"]), "identical generated CSS on both pages")
    for url in [n for n in ("/fonts/source-sans-3-latin.woff2", "/fonts/source-sans-3-latin-ext.woff2", "/fonts/source-serif-4-latin.woff2", "/fonts/source-serif-4-latin-ext.woff2")]:
        check(url in css and local_path(url).is_file(), f"absolute self-hosted font: {url}")
    check("__omReveal" not in texts["index.html"] and ".reveal" not in css and "IntersectionObserver" not in (ROOT / "js/script.js").read_text(encoding="utf-8"), "no hidden reveal content or dead observer")
    check("prefers-reduced-motion" in css, "reduced motion respected")
    check("overflow-y:auto" in css and "100dvh" in css, "height-bounded scrollable menu")
    check("sepia(.16) saturate(.78) contrast(1.04) brightness(1.02)" in css, "original muted photographic treatment")
    check("transform:scale" not in css, "no zoom on archival thumbnails")
    check("stalkci" not in texts["index.html"] and "premještena" in texts["404.html"], "corrected spelling")
    check(docs["404.html"].find("meta", name="robots", content="noindex, follow"), "404 is not indexable")

    graph = json.loads(index.find("script", type="application/ld+json")[0]["text"])["@graph"]
    business = graph[0]
    check(business["telephone"] == "+38758210734" and business["email"] == "milaradovic54@gmail.com", "business contact data retained")
    check(business["address"]["streetAddress"] == "Petra Bojovića bb" and all("Petra Bojovića bb" in text and "Petra Bojovića," not in text and "Petra Bojovića<br>" not in text for text in texts.values()), "user-specified address consistent in content and structured data")
    check(business["employee"]["name"] == "Mila Radović" and business["employee"]["honorificPrefix"] == "primarius dr", "doctor identity retained")
    check(business["openingHoursSpecification"][0]["opens"] == "09:00" and business["openingHoursSpecification"][0]["closes"] == "16:00" and business["openingHoursSpecification"][1]["closes"] == "14:00", "business hours retained")
    check(index.find("link", rel="canonical", href="https://www.optikamila.com/"), "production canonical retained")
    check(index.find("meta", property="og:image", content="https://www.optikamila.com/img/og-optika-mila.png"), "absolute OG image URL")
    png = (ROOT / "img/og-optika-mila.png").read_bytes()
    check(png[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", png[16:24]) == (1200, 630), "OG PNG is 1200 by 630")
    check(index.find("meta", name="twitter:card", content="summary_large_image"), "large share card")
    ET.parse(ROOT / "sitemap.xml")
    check("Sitemap: https://www.optikamila.com/sitemap.xml" in (ROOT / "robots.txt").read_text(encoding="utf-8"), "sitemap declaration")
    check((ROOT / "CNAME").read_text(encoding="utf-8").strip() == "www.optikamila.com", "custom domain unchanged")

    preserved = verify_original_assets(args.check_upstream)
    build_check = subprocess.run(["pwsh", "-NoProfile", "-File", str(ROOT / "tools/build.ps1"), "-Check"], check=True, cwd=Path(__file__).resolve().parent)
    check(build_check.returncode == 0, "generated output matches sources without writing")
    print(json.dumps({"result": "PASS", "original_assets_preserved": preserved, "upstream_checked": args.check_upstream, "index_bytes": len((ROOT / "index.html").read_bytes()), "error_page_bytes": len((ROOT / "404.html").read_bytes()), "script_bytes": len((ROOT / "js/script.js").read_bytes()), "share_image_bytes": len(png)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
