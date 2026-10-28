#!/bin/sh
set -eu
# No document paths or bytes are logged. FreshClam downloads signatures, never client files.
freshclam --stdout
freshclam --daemon --foreground --stdout --checks=4 &
fresh_pid=$!
clamd --foreground --config-file=/opt/scanner/clamd.conf &
clam_pid=$!
python3 -B /opt/scanner/scanner.py &
api_pid=$!
trap 'kill "$fresh_pid" "$clam_pid" "$api_pid" 2>/dev/null || true' EXIT INT TERM
# Terminate the container if any essential process exits; never leave a clean-response stub running.
while kill -0 "$fresh_pid" 2>/dev/null && kill -0 "$clam_pid" 2>/dev/null && kill -0 "$api_pid" 2>/dev/null; do sleep 2; done
exit 1
