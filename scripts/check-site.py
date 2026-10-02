#!/usr/bin/env python3
"""Check Hugo's built pages, links, translations and SEO without a server."""

import argparse
import base64
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

repository = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directory", nargs="?", type=Path, default=repository / "dist")
root = parser.parse_args().directory.resolve()
origin = "https://leftblank.app"
errors = []


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids, self.references = set(), []
        self.metadata, self.alternates = {}, {}
        self.canonical, self.language = None, None
        self.h1_count = 0
        self.images, self.schema = [], []
        self.capture_schema, self.alias = False, False
        self.schema_text = ""
        self.feed(path.read_text())

    def fail(self, message):
        errors.append(f"{self.path.relative_to(root)}: {message}")

    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        if identifier := attrs.get("id"):
            if identifier in self.ids:
                self.fail(f"Duplicate id: {identifier}")
            self.ids.add(identifier)
        if tag == "html":
            self.language = attrs.get("lang")
        if tag == "h1":
            self.h1_count += 1
        if tag == "img":
            self.images.append(attrs)
            if "alt" not in attrs or (not attrs["alt"] and attrs.get("aria-hidden") != "true"):
                self.fail("Image has no alternative text")
            if not all(attrs.get(key) for key in ("width", "height")):
                self.fail("Image has no intrinsic dimensions")
        if tag == "meta":
            self.metadata[attrs.get("name") or attrs.get("property")] = attrs.get("content")
            self.alias |= attrs.get("http-equiv") == "refresh"
        if tag == "link":
            if attrs.get("rel") == "canonical":
                self.canonical = attrs["href"]
            if attrs.get("rel") == "alternate" and "hreflang" in attrs:
                self.alternates[attrs["hreflang"]] = attrs["href"]
        if tag == "script" and attrs.get("type") == "application/ld+json":
            self.capture_schema = True
        for key in ("href", "src"):
            if key in attrs:
                self.references.append(attrs[key])
        if integrity := attrs.get("integrity"):
            asset = root / (attrs.get("src") or attrs["href"]).lstrip("/")
            algorithm, digest = integrity.split("-", 1)
            actual = base64.b64encode(hashlib.new(algorithm, asset.read_bytes()).digest()).decode()
            if digest != actual:
                self.fail(f"Incorrect integrity for {asset.name}")

    def handle_data(self, data):
        if self.capture_schema:
            self.schema_text += data

    def handle_endtag(self, tag):
        if tag == "script" and self.capture_schema:
            self.schema.append(json.loads(self.schema_text))
            self.capture_schema, self.schema_text = False, ""


pages = {path.resolve(): Page(path) for path in root.rglob("*.html")}
if not pages:
    raise SystemExit("Build the site with hugo --minify before checking it.")


def local_path(reference, source):
    url = urlsplit(reference)
    if url.netloc and url.netloc != "leftblank.app":
        return None
    if url.scheme and url.scheme not in ("http", "https"):
        return None
    if not url.path:
        return source
    target = (
        root / unquote(url.path).lstrip("/")
        if url.path.startswith("/")
        else source.parent / unquote(url.path)
    )
    if target.is_dir():
        target /= "index.html"
    return target.resolve()


for path, page in pages.items():
    for reference in page.references:
        target = local_path(reference, path)
        if target is None:
            continue
        if not target.is_relative_to(root) or not target.is_file():
            page.fail(f"Missing local reference: {reference}")
        elif (
            (fragment := urlsplit(reference).fragment)
            and target in pages
            and fragment not in pages[target].ids
        ):
            page.fail(f"Missing anchor: {reference}")
    if page.alias:
        continue
    if page.h1_count != 1:
        page.fail(f"Expected one h1, found {page.h1_count}")
    if not page.metadata.get("description"):
        page.fail("Missing description")
    if page.canonical != page.metadata.get("og:url"):
        page.fail("Canonical and social URL differ")
    if not page.canonical or not page.canonical.startswith(origin + "/"):
        page.fail("Canonical is not on the production domain")
    if not page.schema:
        page.fail("Missing structured data")
    if path.name == "404.html":
        if page.metadata.get("robots") != "noindex":
            page.fail("404 must not be indexed")
        continue
    if set(page.alternates) != {"en-US", "zh-Hans", "x-default"}:
        page.fail("Missing language alternates")
    if page.alternates.get(page.language) != page.canonical:
        page.fail("Missing self-referencing language alternate")
    for language, alternate in page.alternates.items():
        alternate_page = pages.get(local_path(alternate, path))
        if not alternate_page or alternate_page.alternates != page.alternates:
            page.fail(f"Non-reciprocal alternate: {language}")
    if page.metadata.get("og:description") != page.metadata.get("description"):
        page.fail("Social and search descriptions differ")
    if "[i18n]" in path.read_text():
        page.fail("Untranslated text")

for relative, locale in [("index.html", "en-US"), ("zh/index.html", "zh-Hans")]:
    page = pages[(root / relative).resolve()]
    captures = [image for image in page.images if "/app-" in image.get("src", "")]
    if len(captures) != 6 or any(f".{locale}.webp" not in image["src"] for image in captures):
        page.fail("Expected six localized app captures")
    sheets = [image for image in page.images if image.get("class") == "poster-sheet"]
    if len(sheets) != 1 or f"06-poster.{locale}.webp" not in sheets[0].get("src", ""):
        page.fail("Only the poster should repeat a full floating page")
    if page.language != locale or page.schema[0]["@type"] != "SoftwareApplication":
        page.fail("Incorrect homepage language or app schema")
    if "Explore LeftBlank" in page.path.read_text():
        page.fail("Outdated primary call to action")
    if re.search(r"gallery-counter|scene-index|01 /|02 /|03 /|01 — 06", page.path.read_text()):
        page.fail("Outdated numbered showcase")

namespace = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
locations = set()
for path in root.rglob("sitemap.xml"):
    sitemap = ET.fromstring(path.read_text())
    for element in sitemap.findall("s:url/s:loc", namespace):
        locations.add(element.text)
        if not local_path(element.text, root / "index.html").is_file():
            errors.append(f"Sitemap points to a missing page: {element.text}")
expected = {origin + path for path in ["/", "/zh/", "/privacy/", "/zh/privacy/"]}
if locations != expected:
    errors.append(f"Unexpected sitemap URLs: {locations ^ expected}")
if f"Sitemap: {origin}/sitemap.xml" not in (root / "robots.txt").read_text():
    errors.append("robots.txt is missing the sitemap")

for path in root.rglob("*.css"):
    for reference in re.findall(r"url\([\'\"]?([^\)\'\"]+)", path.read_text()):
        target = local_path(reference, path)
        if target and not target.is_file():
            errors.append(f"Missing CSS asset: {reference}")
manifest = json.loads((root / "site.webmanifest").read_text())
for icon in manifest["icons"]:
    if not (root / icon["src"].lstrip("/")).is_file():
        errors.append(f"Missing manifest icon: {icon['src']}")

if errors:
    raise SystemExit("\n".join(errors))
print(
    f"Checked {len(pages)} HTML pages, both languages, six captures per language, "
    "SEO, sitemap and local assets."
)
