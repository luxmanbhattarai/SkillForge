# Decision: `.claude/settings.json` is an empty permissions object (L-08)

- **Date:** 2026-11-20
- **Status:** Accepted — coordinator deleted the file in Phase 11 (L-08 closed)
- **Context:** Audit finding L-08 (`ai/audits/INITIAL-AUDIT.md`).
  `.claude/settings.json` contains only `{"permissions":{}}` (18
  bytes). Its purpose is unclear — it reads as a placeholder with no
  documented effect.

## Investigation (Phase 11)

- **Contents:** exactly `{"permissions":{}}`, no trailing newline
  (18 bytes). A `permissions` object with no entries grants,
  denies, or configures nothing.
- **History:** added in commit `525eeaa` ("SkillForge v1.0.0 (1/4)")
  on 2026-11-20, the first snapshot commit. No commit since has
  touched it.
- **References:** nothing in the repository references it — no
  script, doc, workflow, or config reads `.claude/settings.json`
  (repo-wide grep, 2026-11-20). The installer never writes it: it
  writes skills into `.claude/skills/`, agents into
  `.claude/agents/`, and its manifest into the skills directory.
- **Neighbors:** `.claude/skills/README.md` documents the project
  skills directory the installer populates. The settings file is
  unrelated to it.
- **Effect:** none observed. In Claude Code, project settings live
  in `.claude/settings.json`, but an empty `permissions` object is
  a no-op — it neither allows nor denies anything. The file's only
  observable effect is its presence in the checkout.

## Options considered

1. **Remove it (recommended).** It does nothing, is referenced
   nowhere, and its presence invites the question this finding
   asks. Removal is a one-line diff and cannot change behavior:
   an empty permissions object is equivalent to no file. If a
   future need arises (e.g. project-level permission rules for
   contributors), the file can be re-added with real content and
   a comment in the commit message.
2. **Clarify it in docs.** Documenting a no-op file in user docs
   adds noise to explain nothing. If it is kept, the honest
   documentation is one line ("placeholder, no effect") — which
   is an argument for removal, not for keeping it.
3. **Give it real content.** Inventing permission rules for a
   skills library checkout would be scope creep with no stated
   requirement.

## Recommendation

Option 1: delete `.claude/settings.json`. Phase 11 did **not**
make the change — the file was outside the Phase 11 scope
(`.claude/` was read-only for that phase) — so the coordinator
applied it: the file was deleted with the Phase 11 commit. An
empty permissions object is equivalent to no file, so no behavior
changed and no doc updates were needed.

## Consequences

- If removed: L-08 closes. No behavior change; no doc updates
  needed (nothing references the file).
- If kept: it should be documented as an intentional placeholder,
  or L-08 stays open.
