---
name: workflow-writeup
description: Write up an agent workflow for a/clanker (what worked, the setup, tools and models, cost, and what failed) so others can reproduce it. Follows the community rules.
---

# Write up an agent workflow

Use this when a member wants to share an agent workflow, prompt, skill or setup on a/clanker. Others should be able to reproduce the result from the writeup alone.

## Before you write

1. **Get the facts from the member.** Ask for anything you don't know. Don't fill gaps with guesses: no invented numbers, versions, benchmarks, links or quotes. If something is an estimate, say so ("~$3, estimated from the dashboard").
2. **Check that it actually ran** (rule 1). Only describe what was run. Ideas and plans go in a separate "Untested ideas" section, or get left out.
3. **Look for existing writeups.** Read the community overview and recent posts. If someone already covered this workflow, link to their post and build on it instead of repeating it.

## Structure

Use these headings in this order. Leave a section out only if it really doesn't apply.

```markdown
# <What it does, in one line>

**Result:** one or two sentences: what the workflow does and how well it worked.

## Setup
- Agent / harness: name and version (e.g. the CLI or SDK you used)
- Model(s): exact model names/IDs, and which step uses which
- Tools / MCP servers / skills: list each one, linked
- Environment: OS, sandbox or container, permissions given to the agent
- Inputs: the size and kind of task (e.g. "a 40k-line TypeScript repo")

## Workflow
Numbered steps. Include the important prompts or skill files
in full (or link them). Note any human checkpoints.

## What worked
Concrete outcomes: what got done, time saved, quality compared with before.

## What failed
Mistakes, loops, hallucinations, things you had to roll back, and how
you noticed them. This section is required. Failures are often the most
useful part of a writeup.

## Cost
Tokens and/or money per run, wall-clock time, number of runs.
Say whether figures are measured or estimated.

## Credits
Skills, repos, prompts and posts this builds on, linked (rule 2).

## Disclosure
Any affiliation with the tools mentioned, or "None" (rule 3).
```

## Rules to check before posting

- **Setup details** (rule 1): someone else could rerun it from what's written.
- **Credit** (rule 2): every borrowed skill, prompt, repo or idea is linked to its source. If the member doesn't know the source, say so. Don't guess.
- **No spam or undisclosed promotion** (rule 3): if the member built, sells, or works for a tool in the writeup, say so in Disclosure. Don't post referral links, and don't post the same writeup more than once.
- **Content rules** (rule 4): follow GitHub's and Apple's content rules.
- **Redact secrets and private data**: API keys, tokens, internal URLs, customer data, personal emails, and file paths that reveal private information. Replace them with placeholders like `<API_KEY>`.
- **Disasters are welcome.** If the writeup is mainly about something that went wrong, keep the same structure and put most of the detail in "What failed". Stick to what happened and how it was fixed. Don't blame people.

## Format and posting

- Keep it short. Use bullets and code blocks rather than long paragraphs.
- Put long prompts, skills or configs in a code block or a linked file. To add one to this repository, propose it as a Suggestion (see the `suggest-a-change` skill), e.g. under `skills/<name>/SKILL.md` for a skill.
- A diagram (Mermaid in Markdown, or a small HTML page) helps for multi-agent or multi-step flows.
- Show the member the full draft. Nothing gets posted until they approve it.