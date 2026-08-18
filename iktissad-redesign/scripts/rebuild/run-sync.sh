#!/bin/bash
# Incremental sync from iktissadonline.com + awalan.com into iktissad.com.
# Runs 40-sync.mjs and appends a timestamped result to the log.
#
# Install (runs twice a day, 07:00 and 19:00):
#   crontab -e
#   0 7,19 * * * /Users/moe/Desktop/new\ design\ iktissad/iktissad-redesign/scripts/rebuild/run-sync.sh
set -uo pipefail
cd "$(dirname "$0")/../.." || exit 1
LOG="scripts/rebuild/data/sync.log"
mkdir -p "$(dirname "$LOG")"
{
  echo "════════ $(date '+%Y-%m-%d %H:%M:%S') ════════"
  /opt/homebrew/bin/node --max-old-space-size=4096 scripts/rebuild/40-sync.mjs 2>&1 \
    || node --max-old-space-size=4096 scripts/rebuild/40-sync.mjs 2>&1
  echo ""
} >> "$LOG" 2>&1
