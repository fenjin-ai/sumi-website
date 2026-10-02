#!/bin/sh
# The same checked build runs locally, in GitHub Actions, and in Cloudflare Pages.
set -eu
cd "$(dirname "$0")/.."

hugo_version=$(cat .hugo-version)
case "$(hugo version)" in
  "hugo v${hugo_version} "* | "hugo v${hugo_version}+"*) ;;
  *)
    printf 'Install Hugo %s (see .hugo-version) before building.\n' "$hugo_version" >&2
    exit 1
    ;;
esac

node --check assets/js/appearance.js
node --check assets/js/site.js
hugo --cleanDestinationDir --minify --printI18nWarnings --panicOnWarning
python3 scripts/check-site.py
