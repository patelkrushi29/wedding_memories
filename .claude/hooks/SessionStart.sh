#!/bin/bash
# Fires at the start of every Claude Code session.
# Reminds Claude to orient itself before doing anything.

echo ""
echo "=== Wedding Memories — Session Start ==="
echo "READ THESE FILES BEFORE DOING ANYTHING:"
echo "  1. CLAUDE.md          — rules, Prisma 7 gotchas, module boundaries"
echo "  2. docs/TASKS.md      — what's done, what's next, current bugs"
echo ""
echo "Current branch: $(git branch --show-current 2>/dev/null)"
echo "Last commit:    $(git log -1 --format='%h %s' 2>/dev/null)"
echo "Uncommitted:    $(git status --short 2>/dev/null | wc -l | tr -d ' ') files"
echo "========================================="
echo ""
