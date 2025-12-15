#!/usr/bin/env bash
set -euo pipefail

# Ensure script runs from repo root (script location)
cd "$(dirname "$0")"

LOG_DIR="./logs"
mkdir -p "$LOG_DIR"

# Choose docker compose command
if command -v docker-compose >/dev/null 2>&1; then
  DC_CMD="docker-compose"
else
  DC_CMD="docker compose"
fi

echo "[launch] Bringing up docker services with: $DC_CMD up -d --remove-orphans"
# run docker compose to ensure containers are up
$DC_CMD up -d --remove-orphans

# Helper: stop processes listening on a given TCP port
stop_by_port() {
  local port="$1"
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti tcp:"$port" || true)
  else
    # fallback to ss/awk to extract PIDs; may produce comma-separated PIDs
    pids=$(ss -ltnp 2>/dev/null | awk -vP=":$port" '$4 ~ P {split($6, a, ","); for(i in a) { if(a[i] ~ /pid=/) { sub(/.*pid=/, "", a[i]); sub(/,/, "", a[i]); print a[i] }}}' || true)
  fi

  if [ -n "$pids" ]; then
    echo "[launch] Stopping processes listening on port: $port"
    for pid in $pids; do
      echo "[launch] Killing PID $pid (listening on port $port)"
      kill "$pid" 2>/dev/null || true
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then
        echo "[launch] PID $pid did not exit, forcing"
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  else
    echo "[launch] No processes listening on port: $port"
  fi
}


# API dev server: start after ensuring port is free
echo "[launch] Starting API dev server (npm run dev)"
# Ensure port 3000 is free
stop_by_port 3000
# start in background and capture logs
nohup bash -lc 'pnpm run dev' > "$LOG_DIR/api.log" 2>&1 &

# Client dev server: start after ensuring port is free
echo "[launch] Starting client dev server (client/npm run dev)"
# Ensure port 5173 is free
stop_by_port 5173
(
  cd client || exit 1
  nohup bash -lc 'pnpm run dev' > "../$LOG_DIR/client.log" 2>&1 &
)

echo "[launch] Done. Logs are in $LOG_DIR"
