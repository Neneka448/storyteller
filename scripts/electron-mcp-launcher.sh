#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

LOG_FILE="$PROJECT_ROOT/.electron-mcp-launcher.log"
{
  echo "---- $(date '+%Y-%m-%d %H:%M:%S') ----"
  echo "cwd: $(pwd)"
  echo "args: $*"
  echo "PATH: ${PATH:-}"
} >> "$LOG_FILE" 2>/dev/null || true

# Prefer the real Electron binary shipped by the electron npm package on macOS.
ELECTRON_BIN="$PROJECT_ROOT/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"

if [[ ! -x "$ELECTRON_BIN" ]]; then
  # Fallback: the npm bin shim (may be a node script).
  ELECTRON_BIN="$PROJECT_ROOT/node_modules/.bin/electron"
fi

if [[ ! -x "$ELECTRON_BIN" ]]; then
  echo "[electron-mcp-launcher] Cannot find an executable Electron binary." >&2
  echo "[electron-mcp-launcher] Run 'yarn install' first, then retry." >&2
  exit 1
fi

# Forward all args injected by Playwright (e.g. --inspect=0 --remote-debugging-port=0).
# Important: Node/Electron flags must come *before* the app path, otherwise
# Playwright won't see the expected "DevTools listening" line.
exec "$ELECTRON_BIN" "$@" "$PROJECT_ROOT"
