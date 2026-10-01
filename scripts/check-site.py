#!/usr/bin/env python3
"""Check the deployable, dependency-free site for broken local references."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json

root = Path(__file__).resolve().parent.parent / 'dist'

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.references = set(), []
        self.errors = []
    def handle_starttag(self, tag, pairs):
        attrs = dict(pairs)
        identifier = attrs.get('id')
        if identifier:
            if identifier in self.ids: self.errors.append(f'Duplicate id: {identifier}')
            self.ids.add(identifier)
        if tag == 'img' and not attrs.get('alt'): self.errors.append('Image has no alternative text')
        if ('data-en' in attrs) != ('data-zh' in attrs): self.errors.append('Incomplete bilingual text')
        for key in ('href', 'src'):
            if key in attrs: self.references.append(attrs[key])

page = Page()
page.feed((root / 'index.html').read_text())
for reference in page.references:
    url = urlsplit(reference)
    if url.scheme or url.netloc: continue
    if url.path:
        path = (root / unquote(url.path).lstrip('/')).resolve()
        if not path.is_relative_to(root) or not path.is_file(): page.errors.append(f'Missing local asset: {reference}')
    elif url.fragment and url.fragment not in page.ids: page.errors.append(f'Missing anchor: {reference}')
manifest = json.loads((root / 'site.webmanifest').read_text())
for icon in manifest['icons']:
    if not (root / icon['src'].lstrip('/')).is_file(): page.errors.append(f'Missing manifest icon: {icon["src"]}')
assert not page.errors, '\n'.join(page.errors)
print(f'Checked page, bilingual content, anchors and {len(page.references)} references.')
