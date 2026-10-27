#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo "    HospitalTwin-AI: Bản sao số bệnh viện ngoại trú       "
echo "=========================================================="

if [ ! -x backend/.venv/bin/python ] || [ ! -d frontend/node_modules ]; then
    echo "Thiếu thư viện. Chạy npm run setup trước."
    exit 1
fi
# Reuse only this application's healthy backend on port 8000
BACKEND_PID=""
if curl -s -f http://127.0.0.1:8000/api/v1/health 2>/dev/null | backend/.venv/bin/python -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if "Hospital" in str(d) else 1)' >/dev/null 2>&1; then
    echo "[1/2] Đã phát hiện Backend đang chạy trên http://127.0.0.1:8000 (Tái sử dụng phiên hiện có)."
else
    echo "[1/2] Khởi động Backend FastAPI trên cổng 8000..."
    (cd backend && PYTHONPATH=. ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000) &
    BACKEND_PID=$!
    sleep 1
fi

cleanup() {
    echo ""
    echo "Đang dừng dịch vụ HospitalTwin-AI..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "[2/2] Khởi động Frontend Vite trên http://127.0.0.1:5174..."
echo "  -> Ứng dụng: http://127.0.0.1:5174"
echo "  -> API Docs: http://127.0.0.1:8000/docs"
echo "=========================================================="

(cd frontend && npm run dev)
