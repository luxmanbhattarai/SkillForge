# Documentation

Start at the root [`README.md`](../README.md) and
[`AGENTS.md`](../AGENTS.md) (discovery rules for AI agents). Each guide
below is the canonical home for its topic; other pages cross-link to it
rather than duplicating it (see
`ai/decisions/2026-11-20-docs-canonical-homes.md`).

## Using the library

| Guide | What it covers |
| --- | --- |
| [`INSTALLATION.md`](INSTALLATION.md) | Install, update, uninstall, restore; all targets and scopes; installer safety rules (conflicts, backups, atomic installs, manifest) |
| [`UPGRADE.md`](UPGRADE.md) | Upgrading installed skills; migrating from v1.0.0 (Codex/Antigravity path changes, installer behavior changes) |
| [`AGENT-COMPATIBILITY.md`](AGENT-COMPATIBILITY.md) | Supported agents, install paths, per-agent notes, compatibility data |
| [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) | Common errors and fixes: install, validation, registry, evals, query CLI |

## Contributing

| Guide | What it covers |
| --- | --- |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Ground rules, adding a skill end to end, upstream imports, agents/workflows, PR process |
| [`SKILL-STANDARDS.md`](SKILL-STANDARDS.md) | Skill format, frontmatter (including the parser subset), the 22-element quality standard, quality scoring |
| [`PROGRESSIVE-DISCLOSURE.md`](PROGRESSIVE-DISCLOSURE.md) | Progressive disclosure standard — line budgets, disclosure folders, loading contract |
| [`UPDATE-PROCESS.md`](UPDATE-PROCESS.md) | Re-importing upstream skills, re-verifying original skills, versioning, release checklist |
| [`OFFICIAL-SOURCES.md`](OFFICIAL-SOURCES.md) | Upstream vendors and the canonical source list (`sources/official-sources.md`) |

## Reference

| Guide | What it covers |
| --- | --- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Repository layout, categories, registry, validation layer, installer internals, evals, scanner, CI |
| [`EVALUATION.md`](EVALUATION.md) | Behavioral evals — summary; the canonical guide is [`evals/README.md`](../evals/README.md) |
| [`SECURITY-SCANNING.md`](SECURITY-SCANNING.md) | The security scanner: patterns, exceptions, guards, limits |
| [`THREAT-MODEL.md`](THREAT-MODEL.md) | Threats, mitigations, residual risks, trust boundaries |
| [`SECURITY.md`](../SECURITY.md) | Vulnerability reporting policy and scope |

## Internal notes

`ai/` holds working notes that are not user documentation: the
repository audit (`ai/audits/`), architecture decisions
(`ai/decisions/`), per-phase notes (`ai/phase*/NOTES.md`), and test
results (`ai/test-results/`). The production-upgrade status tracker is
`ai/PROJECT-STATUS.md`.
