#!/bin/bash
# Fires after every tool use.
# Checks for uncommitted changes and reminds Claude to commit regularly.
# Only warns — does not auto-commit (Claude decides when work is complete).

UNCOMMITTED=$(git status --short 2>/dev/null | grep -c '^[^ ?]' || echo 0)

if [ "$UNCOMMITTED" -gt 5 ]; then
  echo ""
  echo "[PostToolUse] $UNCOMMITTED staged/modified files — consider committing soon."
  echo ""
fi
