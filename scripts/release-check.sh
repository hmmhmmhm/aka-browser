#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== TypeScript, lint, and build =="
pnpm exec turbo run check-types lint build --force

echo
echo "== Dependency audit =="
pnpm audit --prod=false

echo
echo "== Source file size policy =="
find apps/browser/src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 \
  | xargs -0 wc -l \
  | awk '$2 != "total" && $1 > 450 {print; bad=1} END {exit bad}'

echo
echo "== Whitespace check =="
git diff --check

echo
echo "Release readiness checks passed."
