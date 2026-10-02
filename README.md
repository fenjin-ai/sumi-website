# LeftBlank website

The bilingual product website at [leftblank.app](https://leftblank.app), built with Hugo. Content lives in language-specific Markdown files; shared templates produce complete HTML pages. CSS and a small browser script add the spatial product showcase. No theme dependency, database, npm installation, analytics, or external web fonts are needed.

## Edit the site

- `content/en/_index.md`, `content/zh/_index.md`: homepage copy, creative scenes, and their localized detail labels. Keep scene IDs in the same order in both languages.
- `content/*/privacy.md`: localized privacy pages in ordinary Markdown.
- `i18n/`: short interface labels, navigation, and download messages.
- `layouts/`: shared Hugo templates and small section partials.
- `data/works.yaml`: scene IDs, screenshot filenames, and original document dimensions.
- `assets/css/`, `assets/js/`: base styles, a separate showcase stylesheet, and progressive enhancements, bundled and fingerprinted by Hugo Pipes.
- `static/`: original documents, real app captures, social cards, icons, and the fourteen-example ZIP.
- `hugo.toml`: language routes, production domain, GitHub URL, and direct nightly fallback.
- `dist/`: generated output, ignored by Git. Edit the source above.

The compiler is pinned in `.hugo-version`. Use that version of Hugo; the standard edition is sufficient.

```sh
hugo server --bind 127.0.0.1 --port 4398 --disableFastRender
```

For a production build and the same checks as CI:

```sh
node --check assets/js/appearance.js
node --check assets/js/site.js
hugo --cleanDestinationDir --minify --printI18nWarnings --panicOnWarning
python3 scripts/check-site.py
```

The checker uses Python 3.9+ and its standard library. It validates local links and anchors, image descriptions and dimensions, asset integrity, reciprocal language alternates, page metadata, JSON-LD, six localized captures, manifests, sitemap coverage, and robots. CI verifies the pinned Hugo archive against its published checksum before running these checks.

## Languages, search, and interaction

English lives at `/`, Chinese at `/zh/`. Each has its own HTML, screenshots, canonical URL, reciprocal `hreflang`, social metadata, and application structured data. Hugo generates sitemap and robots files. Privacy lives at `/privacy/` and `/zh/privacy/`; `/privacy.html` redirects to its new location. Old `?lang=en` / `?lang=zh` links still work. Explicit language links retain browser preferences. System/light/dark appearance is resolved before first paint.

On wide screens, the showcase follows normal page scrolling: a sticky stage changes between real app captures and topic-specific ink drawings. Each scene has its own composition: an uncluttered essay, a typeset equation, growing report bars, staggered presentation cards, drawn diagram connections, and one floating poster sheet. Detail text and chart values come from the original example documents; their small Hugo partials live in `layouts/partials/details/`. Pointer movement adds depth and a local magnifying lens. The lens stays inside the capture, beneath foreground artwork. Native hit testing hides it only when the pointer leaves the capture or enters that artwork, while scrolling or resizing clears it until the pointer moves again.

On smaller screens, the same six articles become native horizontally scrollable cards, with keyboard access and scroll snapping. Cards keep their natural content height, and the container follows the current card rather than stretching every card to the tallest scene. A ResizeObserver keeps that height correct as the viewport or content changes. The container allows only horizontal scrolling; vertical gestures scroll the page. Every scene offers an accessible full-size image dialog with native Escape and focus restoration. There is no autoplay or scrolling interception.

Reduced motion disables animations, pointer effects, and transforms. Without JavaScript, all six scenes remain readable, language links and direct downloads work, and large-image links open the original screenshots. Browser checks after interaction changes should cover both languages and appearances, desktop/mobile resizing, the final scene, keyboard preview/close, and horizontal scrolling.

## Downloads

Primary buttons point directly to a verified macOS Apple silicon preview ZIP. An ordinary click queries GitHub's public releases API for the newest published `preview-*` release with a matching ZIP. Failure or timeout falls back to the direct link; modified clicks and JavaScript-free browsers also use it. No request runs on page load. Refresh `params.downloadURL` in `hugo.toml` when publishing to keep the fallback current.

## Publish

The existing Site identity is preserved in `.openai/hosting.json` and serves `dist/`. Build and check, then use the Sites workflow to push the exact source, package output, save a version, and deploy. DNS remains in Cloudflare. GitHub checks do not publish automatically. Credentials do not belong in the repository.

The generated output also works on any static host. For Cloudflare Pages, set the build command to `hugo --minify`, the output directory to `dist`, and `HUGO_VERSION` to the version in `.hugo-version`. Keep canonical URLs pointed at `https://leftblank.app` for previews as well.

## License

MIT. LeftBlank's name and Sigma artwork identify this project; forks should use their own identity.
