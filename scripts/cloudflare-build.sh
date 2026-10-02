#!/bin/sh
# Pages skips dependency auto-detection; only the locked Node tools are required.
set -eu
cd "$(dirname "$0")/.."
npm ci --ignore-scripts
exec sh scripts/build.sh
