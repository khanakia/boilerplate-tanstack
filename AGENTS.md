# Repository Guidelines for AI Agents & Developers

**CRITICAL CONTEXT:**
This project relies heavily on **Code Generation**.

1. **NEVER** modify files inside `gen/`, `generated/` directories directly.

***

## 📚 Documentation Index

For detailed instructions, rules, and navigation, please refer to the specialized guides below.

### 🧠 Core Intelligence & Rules (.ai/)

These documents define the "Physics" of the project. AI Agents must strictly adhere to these.

* **[🎨 Frontend Standards (FRONTEND\_STANDARDS.md)](.ai/FRONTEND_STANDARDS.md)**: React, TypeScript, TailwindCSS, and UI patterns.

**Workflow:**

1. **Before modifying a page:** Read `.claude/docs/web/[page-name].md`
2. **After changes:** Update the doc to keep it in sync with the code

**Documentation should include:**

* Route path and file location
* State variables and their purposes
* GraphQL queries and mutations
* TypeScript interfaces
* UI structure and features
* Related backend files

**Documented pages:**
| Page | Doc File | Route |
|------|----------|-------|
| Item Group Detail | [item-group-detail.md](.claude/docs/web/item-group-detail.md) | `/item-groups/:id` |

**When creating new pages:** Create a corresponding doc file following the same structure.

## 📦 Backend Package Documentation Practice

Each package should have a corresponding documentation file in `.claude/docs/backend/`. This saves tokens by avoiding repeated codebase exploration.

**Workflow:**

1. **Before modifying a package:** Read `.claude/docs/backend/[package-name].md`
2. **After changes:** Update the doc to keep it in sync with the code

**Documentation should include:**

* Package path and purpose
* Public functions/types and their signatures
* Usage examples (from cron, CLI, etc.)
* Code patterns used (tracing, logging, error handling)
* Dependencies and related files

**When creating new packages:** Create a corresponding doc file following the same structure.

## 📋 Context-Specific Rules

Read these rule files **only when performing the specific action** (saves tokens):

| Action | Rule File | When to Read |
|--------|-----------|--------------|
| Git commit | [git-commit.md](.claude/rules/git-commit.md) | Before running `git commit` |

<!-- Add more rules as needed:
| Creating PR | [pr-creation.md](.claude/rules/pr-creation.md) | Before `gh pr create` |
| Writing tests | [testing.md](.claude/rules/testing.md) | Before creating test files |
| Code generation | [code-generation.md](.claude/rules/code-generation.md) | Before running codegen tasks |
-->

## 📝 Git Commit Rules

* **NEVER** include "Generated with Claude Code" or similar AI attribution in commit messages
* **NEVER** include "Co-Authored-By: Claude" or any AI co-author lines
* Keep commit messages clean and focused on the changes only

## Summary

The structure separates concerns based on the 'reader' (Humans vs. AI vs. Editor):

* `**docs/**` These are explanatory guides for **human developers** (setup, workflows, API usage).

* `**AGENT.md**` **&** `**.ai/**` This is specifically for the AI Agent. `AGENT.md` acts as the entry point (system prompt) standardizing the context initialization. The `.ai` folder contains imperative rules, architectural constraints, and code examples optimized for LLM token efficiency, not human readability.

* `**.cursor/rules**` These aren't documentation but **active rules** for the Cursor editor. They inject specific context automatically before edits. If we aren't using Cursor, this folder is safe to remove.
