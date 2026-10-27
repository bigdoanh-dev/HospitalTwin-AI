#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then PYTHON_BIN=python3; fi
if [ ! -x backend/.venv/bin/python ]; then "$PYTHON_BIN" -m venv backend/.venv; fi
backend/.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
echo "Sẵn sàng. Chạy npm run dev, mở http://127.0.0.1:5174"
