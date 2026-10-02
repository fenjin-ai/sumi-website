"""Reject broken built output; never query a live website or external service."""

import json
import os
import runpy
import shutil
from pathlib import Path

import pytest

REPOSITORY = Path(__file__).resolve().parents[2]
CHECKER = REPOSITORY / "scripts/check-site.py"


@pytest.fixture
def output(tmp_path):
    """Keep large assets on SSD and copy only documents that a test changes."""
    destination = tmp_path / "dist"
    shutil.copytree(REPOSITORY / "dist", destination, copy_function=os.link)
    return destination


def check(directory, monkeypatch):
    monkeypatch.setattr("sys.argv", [str(CHECKER), str(directory)])
    runpy.run_path(str(CHECKER), run_name="__main__")


def replace(path, old, new):
    text = path.read_text()
    assert old in text
    path.unlink()  # Detach the hard link before writing a mutated fixture.
    path.write_text(text.replace(old, new, 1))


def test_valid_bilingual_output(output, monkeypatch, capsys):
    check(output, monkeypatch)
    assert "Checked 8 HTML pages" in capsys.readouterr().out


def test_requires_a_build(tmp_path, monkeypatch):
    with pytest.raises(SystemExit, match="Build the site"):
        check(tmp_path, monkeypatch)


@pytest.mark.parametrize(
    ("markup", "message"),
    [
        ('<a href="/missing/">Missing</a>', "Missing local reference"),
        ('<a href="#missing">Missing</a>', "Missing anchor"),
        ('<a href="/../outside.txt">Escape</a>', "Missing local reference"),
        ('<img src="/favicon.svg" width="10" height="10">', "alternative text"),
        ('<img src="/favicon.svg" alt="Icon">', "intrinsic dimensions"),
        ('<span id="writing"></span>', "Duplicate id"),
        ("<h1>Another heading</h1>", "Expected one h1"),
        ("<span>[i18n]</span>", "Untranslated text"),
        ("<span>Explore LeftBlank</span>", "Outdated primary"),
        ("<span>01 /</span>", "Outdated numbered showcase"),
    ],
)
def test_rejects_broken_page(output, monkeypatch, markup, message):
    replace(output / "index.html", "</body>", markup + "</body>")
    with pytest.raises(SystemExit, match=message):
        check(output, monkeypatch)


def test_rejects_wrong_canonical_domain(output, monkeypatch):
    replace(output / "index.html", "https://leftblank.app/", "https://wrong.test/")
    with pytest.raises(SystemExit, match="production domain"):
        check(output, monkeypatch)


def test_rejects_nonreciprocal_translation(output, monkeypatch):
    replace(output / "zh/index.html", "hreflang=en-US", "hreflang=fr-FR")
    with pytest.raises(SystemExit, match=r"language alternates|Non-reciprocal"):
        check(output, monkeypatch)


def test_rejects_changed_asset_integrity(output, monkeypatch):
    css = next((output / "css").glob("*.css"))
    replace(css, ":root", ":not-root")
    with pytest.raises(SystemExit, match="Incorrect integrity"):
        check(output, monkeypatch)


def test_rejects_missing_sitemap_page(output, monkeypatch):
    replace(
        output / "en/sitemap.xml",
        "https://leftblank.app/privacy/",
        "https://leftblank.app/missing/",
    )
    with pytest.raises(SystemExit, match="Sitemap points to a missing page"):
        check(output, monkeypatch)


def test_rejects_missing_robots_sitemap(output, monkeypatch):
    replace(output / "robots.txt", "Sitemap:", "Removed:")
    with pytest.raises(SystemExit, match=r"robots\.txt"):
        check(output, monkeypatch)


def test_rejects_missing_manifest_icon(output, monkeypatch):
    manifest = output / "site.webmanifest"
    icon = json.loads(manifest.read_text())["icons"][0]["src"]
    replace(manifest, icon, "/missing-icon.png")
    with pytest.raises(SystemExit, match="Missing manifest icon"):
        check(output, monkeypatch)
