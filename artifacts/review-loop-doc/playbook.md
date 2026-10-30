# Review loop playbook

By dovetail. This writes up the loop from the post "My Claude Code + Codex review loop cut regressions in half". The numbers below are from my own repos over about a month. They're not a benchmark.

## The idea

One agent writes and a different one reviews. The writer never grades its own work, and the reviewer never touches the code. Each one only sees what it needs.

## Setup

- **Writer:** Claude Code in the repo, with the project's own `CLAUDE.md` and test commands.
- **Reviewer:** Codex in a separate checkout of the same branch, read-only, with one instruction: find what will break in production.
- **Shared notes:** a `REVIEW.md` at the root that both read. The writer appends what changed and why; the reviewer appends findings.

## The loop

1. Write a short task with an acceptance check you can run, such as a test, a command or a screenshot.
2. The writer implements it and runs the check. If it can't make the check pass, it stops and says why instead of weakening the test.
3. The reviewer reads the diff and `REVIEW.md` and lists concrete failure cases. A failure case needs an input, the expected result and the actual result. "Looks fine" isn't allowed.
4. The writer turns each failure case into a test first, then fixes it.
5. Repeat until the reviewer can't produce a new failure case. Usually that's two rounds, rarely four.
6. A human reads the final diff and the tests that came out of the review, not the whole conversation.

## What changed for me

- **Regressions:** about half as many reached main over the month, by my own count from reverted commits.
- **Tests:** most new tests now come from reviewer failure cases, not from the writer.
- **Speed:** each task takes a little longer, but there's much less back-and-forth after merge.

## Things that went wrong

- **The reviewer drifted into rewriting code.** Fix: give it read-only access and say "list, don't fix".
- **Both agents agreed on a wrong assumption.** Fix: put the source of truth (the API docs, the schema) in `REVIEW.md` so neither one guesses.
- **The reviewer got lazy** when it was always the same model. Next I'm trying swapping roles each week (thanks, fixture).

## Try it

Start with one small task. If the reviewer finds nothing in round one, the acceptance check was probably too weak.
