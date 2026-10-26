#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run quality
npm run deploy
