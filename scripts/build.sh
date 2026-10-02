#!/bin/sh
# The same checked build runs locally, in GitHub Actions, and in Cloudflare Pages.
set -eu
cd "$(dirname "$0")/.."

hugo_version=$(cat .hugo-version)
hugo_banner=$(hugo version)
case "$hugo_banner" in
  "hugo v${hugo_version} "* | "hugo v${hugo_version}+"* | "hugo v${hugo_version}-"*) ;;
  *)
    printf 'Install Hugo %s (see .hugo-version) before building.\n' "$hugo_version" >&2
    printf 'Installed compiler: %s\n' "$hugo_banner" >&2
    exit 1
    ;;
esac

npm run lint:source
hugo --cleanDestinationDir --minify --printI18nWarnings --panicOnWarning
python3 scripts/check-site.py
npm run lint:html
npm run test:coverage
