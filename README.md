# LeftBlank website

The bilingual product website at [leftblank.app](https://leftblank.app), built with Hugo. Content lives in language-specific Markdown files; shared templates produce complete HTML pages. CSS and a small browser script add the spatial product showcase. The published site uses no runtime framework, database, analytics, or external web fonts. Development checks use locked npm and uv tools.

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

Install the development tools with the Node version in `.node-version` and Python in `.python-version`:

```sh
npm ci --ignore-scripts
uv sync --locked
```

For the checked production build used by CI and Cloudflare Pages:

```sh
sh scripts/build.sh
```

The checked build runs Prettier (including Hugo's Go templates), strict ESLint with zero warnings, Stylelint's standard rules, rendered HTML validation, and JavaScript tests before publication. Formatting exceptions are limited to Hugo-generated/minified syntax and explicitly documented CSS cascade rules. The compiler treats Hugo warnings as errors.

The checker uses Python 3.9+ and its standard library. It validates local links and anchors, image descriptions and dimensions, asset integrity, reciprocal language alternates, page metadata, JSON-LD, six localized captures, manifests, sitemap coverage, and robots. CI verifies the pinned Hugo archive against its published checksum before running these checks.

## Languages, search, and interaction

English lives at `/`, Chinese at `/zh/`. Each has its own HTML, screenshots, canonical URL, reciprocal `hreflang`, social metadata, and application structured data. Hugo generates sitemap and robots files. Privacy lives at `/privacy/` and `/zh/privacy/`; `/privacy.html` redirects to its new location. Old `?lang=en` / `?lang=zh` links still work. Explicit language links retain browser preferences. System/light/dark appearance is resolved before first paint.

On wide screens, the showcase follows normal page scrolling: a sticky stage changes between real app captures and topic-specific ink drawings. Each scene has its own composition: an uncluttered essay, a typeset equation, growing report bars, staggered presentation cards, drawn diagram connections, and one floating poster sheet. Detail text and chart values come from the original example documents; their small Hugo partials live in `layouts/partials/details/`. Pointer movement adds a small amount of depth. Fine pointers use a native SVG arrow with a pen-nib detail, in ink, paper, and sage colors. It follows the current light/dark theme and uses a sage variant for links and buttons; `assets/css/cursor.css` supplies standard cursor fallbacks. Touch devices keep their normal behavior.

On smaller screens, the same six articles become native horizontally scrollable cards, with keyboard access and scroll snapping. Cards keep their natural content height, and the container follows the current card rather than stretching every card to the tallest scene. A ResizeObserver keeps that height correct as the viewport or content changes. The container allows only horizontal scrolling; vertical gestures scroll the page. Every scene offers an accessible full-size image dialog with native Escape and focus restoration. There is no autoplay or scrolling interception.

Reduced motion disables animations, pointer effects, and transforms. Without JavaScript, all six scenes remain readable, language links and direct downloads work, and large-image links open the original screenshots. Browser checks after interaction changes should cover both languages and appearances, desktop/mobile resizing, the final scene, keyboard preview/close, and horizontal scrolling.

## Quality checks

```sh
npm run verify
uv run ruff check scripts tests/python
uv run ruff format --check scripts tests/python
uv run pytest
npm run test:browser
```

JavaScript tests cover the browser interactions and PR reporter. Every source file must reach **80% statements, branches, functions and lines**; untested new JavaScript files are included in coverage. Python checker tests require **80% combined line and branch coverage** and deliberately break metadata, links, anchors and asset integrity. Tests make no live API or database calls. Keep the source fallback download link usable independently of release lookup.

Browser checks use Chromium and WebKit. CI installs both engines; for local verification install them with `npx playwright install chromium webkit`. These checks exercise both languages and appearances, all six desktop scenes, mobile card height and page scrolling, Escape/focus restoration, reduced motion, and the JavaScript-free fallback. Axe audits the current readable scene and the rest of the page; intentionally dimmed, inactive scene copy is audited when selected. Decorative artwork labels are excluded from text-contrast checks; their images retain descriptive alternative text. Failures retain browser traces and screenshots.

`Website CI` also runs ShellCheck, actionlint, Ruff and dependency advisory checks. GitHub Actions have pinned commit SHAs, read-only test permissions, timeouts and cancellation of superseded runs. Dependabot checks Actions, npm and uv weekly. Development tools are version-pinned in lockfiles and are excluded from the published site.

Coverage summaries are posted to the PR by the `PR coverage report` workflow and update the bot's existing comment. The reporter verifies the current PR head, rejects invalid percentages, and reads JSON artifacts without running PR code with write permissions. Detailed HTML reports remain available as CI artifacts for 14 days. If reporting needs a retry, manually dispatch that workflow with the completed PR run's `run_id`; it can also report after merge.

## Downloads

Primary buttons point directly to a verified macOS Apple silicon preview ZIP. An ordinary click queries GitHub's public releases API for the newest published `preview-*` release with a matching ZIP. Failure or timeout falls back to the direct link; modified clicks and JavaScript-free browsers also use it. No request runs on page load. Refresh `params.downloadURL` in `hugo.toml` when publishing to keep the fallback current.

## Publish

Cloudflare Pages project `leftblank-website` connects directly to `leftblank-app/website` on GitHub and serves `leftblank.app`. The production branch is `main`: merging a PR or pushing to `main` runs the checked build and publishes `dist/` only after all checks pass. Other branches produce preview deployments. GitHub Actions runs the same checked build plus Python, workflow and browser checks on PRs and on `main`. The main-branch rules require a passing `Website checks` result and squash merges, block force pushes and deletion, and require PR review conversations to be resolved. Push source changes to the GitHub remote (`origin`); the former Sites source mirror is a separate repository.

Pages settings are: build command `sh scripts/build.sh`, output directory `dist`, and `HUGO_VERSION=0.166.0` in both production and preview environments. When changing `.hugo-version`, update that Pages variable as well; the build refuses a mismatched compiler. No GitHub deployment secrets are needed. Keep canonical URLs pointed at `https://leftblank.app` for preview deployments too.

The previous publication remains available at `https://leftblank.wangfenjin.chatgpt.site` as a fallback. Its hosting manifest is recoverable from Git history; no active Sites manifest remains in this checkout. Cloudflare Pages owns production deployment. Generated output also works on any other static host.

## License

MIT. LeftBlank's name and Sigma artwork identify this project; forks should use their own identity.
