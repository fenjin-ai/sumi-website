# Bounded brace parsing

This is the MIT-licensed npm braces 3.0.3 source, with local version
3.0.4-leftblank.1. It is a local patch, not an upstream release.

GHSA-vfj7-8cjw-p6xm has no patched npm release as of 2026-10-03. The website's
Stylelint glob dependencies require braces. The parser now bounds nesting to
128 levels, and each public recursive AST operation validates depth and node
count iteratively before walking. Normal site globs are unchanged. The original
LICENSE is retained. npm overrides all transitive braces imports to this copy;
the dependency audit remains enabled. Replace it with an upstream fixed release
when available. Tests cover deep brace/parenthesis inputs and manually supplied ASTs.
