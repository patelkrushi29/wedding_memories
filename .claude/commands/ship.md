# /ship

Commit and push all current work cleanly.

Steps:
1. Run `npx tsc --noEmit` — if TypeScript errors exist, stop and report them
2. Run `git status` to see what's changed
3. Group changes into logical commits (don't dump everything in one commit)
4. Write clear commit messages in imperative mood describing WHY not just what
5. Push to `origin claude/serene-darwin-wegA5`
6. Update `docs/TASKS.md` — move completed tasks to the Completed table
7. Add an entry to `docs/CHANGELOG.md` for this session's work
8. Report what was committed and what's next

Do NOT push if TypeScript has errors. Fix them first.
