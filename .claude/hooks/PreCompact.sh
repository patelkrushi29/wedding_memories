#!/bin/bash
# Fires before Claude Code compacts the context window.
# Saves a snapshot of current task state so work can resume cleanly.

TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
BRANCH=$(git branch --show-current 2>/dev/null)
UNCOMMITTED=$(git status --short 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "=== Context compaction imminent ==="
echo "Time:         $TIMESTAMP"
echo "Branch:       $BRANCH"
echo "Uncommitted:  $UNCOMMITTED files"
echo ""
echo "Before compaction, Claude should:"
echo "  1. Commit any completed work"
echo "  2. Update docs/TASKS.md with current progress"
echo "  3. Add an entry to docs/CHANGELOG.md"
echo "  4. Note the next task clearly"
echo "==================================="
echo ""
