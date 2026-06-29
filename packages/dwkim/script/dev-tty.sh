#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$PROJECT_ROOT"

if command -v bun >/dev/null 2>&1; then
  BUN_BIN=$(command -v bun)
elif [ -n "${BUN_INSTALL:-}" ] && [ -x "$BUN_INSTALL/bin/bun" ]; then
  BUN_BIN="$BUN_INSTALL/bin/bun"
elif [ -x "$HOME/.bun/bin/bun" ]; then
  BUN_BIN="$HOME/.bun/bin/bun"
else
  echo "dwkim dev requires bun. Install it from https://bun.sh/docs/installation" >&2
  exit 127
fi

if command -v node >/dev/null 2>&1; then
  NODE_BIN=$(command -v node)
else
  echo "dwkim dev requires node." >&2
  exit 127
fi

# `bun run --filter dwkim dev` captures child output and prefixes each line,
# which corrupts an interactive TUI. Attach the actual app process to the
# controlling terminal when one exists so local dev matches the published CLI.
"$BUN_BIN" script/build.js

if { : </dev/tty; } 2>/dev/null && { : >/dev/tty; } 2>/dev/null; then
  exec "$NODE_BIN" dist/index.js "$@" </dev/tty >/dev/tty 2>/dev/tty
fi

exec "$NODE_BIN" dist/index.js "$@"
