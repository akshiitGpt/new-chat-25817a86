#!/usr/bin/env bash
set -euo pipefail

if ! node --version | grep -Eq '^v(2[2-9]|[3-9][0-9])\.'; then
  echo "Node.js 22+ is required" >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install --omit=dev
fi

npm run migrate
npm start
