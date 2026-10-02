# LeftBlank website

**Ink for your thoughts**

The bilingual landing page for [LeftBlank](https://github.com/leftblank-app/leftblank), at [leftblank.app](https://leftblank.app).

Chinese identity: **留白 · 此中有真意，欲辨已忘言**.

## Structure

The complete site is in `dist/`: plain HTML, CSS and a small amount of JavaScript. There is no build step, package manager, application server, analytics or external font dependency. Appearance follows the system by default. Language and appearance preferences stay in the browser, and `?lang=en` / `?lang=zh` can share a language choice.

Brand assets come from the app repository's deterministic Sigma generator. The hero composes original Typst works into a paper collage. A keyboard-accessible six-scene gallery shows real app captures: essays, technical notes, reports, presentation pages, diagrams and posters. Images change with the language. The downloadable ZIP contains fourteen original, compilable Typst examples. Presentation pages export to PDF; the site does not promise PPTX or animation export. The app privacy policy is at `/privacy.html`.

## Develop

```sh
python3 -m http.server 4397 --bind 127.0.0.1 --directory dist
node --check dist/appearance.js
node --check dist/site.js
python3 scripts/check-site.py
```

Open `http://127.0.0.1:4397`. Check both languages and appearances, keyboard navigation, reduced motion and mobile layouts before publishing. CI checks syntax and local references on every PR; monthly Dependabot updates are grouped into one PR.

## Publish

The public site is hosted with Sites and uses the project identity in `.openai/hosting.json`. DNS is managed in Cloudflare. Use the Sites publishing workflow to push the reviewed source, save the static archive and deploy a version. GitHub is the public source of record; a GitHub push runs checks but does not publish by itself. Hosting credentials never belong in this repository.

The page currently links to the public application repository because LeftBlank is a development preview with no public release package. Once available, replace the two primary GitHub calls to action with the official download or App Store URL. Do not display an App Store badge before the listing exists.

## License

MIT. LeftBlank's brand name and Sigma artwork identify the LeftBlank project; forks should use their own product identity.
