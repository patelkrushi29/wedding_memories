#!/bin/bash
# Fires at the start of every Claude Code session.

echo ""
echo "=== Wedding Memories — Session Start ==="
echo "READ BEFORE DOING ANYTHING:"
echo "  1. CLAUDE.md       — rules, module boundaries"
echo "  2. docs/TASKS.md   — what's done, what's next"
echo "  3. docs/DEPLOY.md  — if production / Postgres / R2 work"
echo ""
echo "Branch:     $(git branch --show-current 2>/dev/null)"
echo "Commit:     $(git log -1 --format='%h %s' 2>/dev/null)"
echo "Uncommitted: $(git status --short 2>/dev/null | wc -l | tr -d ' ') files"
echo "========================================="
echo ""
