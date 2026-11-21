# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-20

Initial release of SkillForge, a universal AI Agent Skills library.

### Added

- Repository foundation: README, AGENTS.md discovery rules, skill
  standards, templates, and the Agent Skills specification layout.
- 49 imported upstream skills from 6 vendors (Anthropic, Vercel,
  Superpowers, Prisma, Marketing Skills, Agentic SEO), with attribution
  and licenses preserved under `skills/upstream/`.
- Original skills across 15 categories: core, frontend, backend,
  database, auth, architecture, infrastructure, testing, security, SEO,
  performance, content, media, metadata, and documentation.
- 20 specialized agent definitions under `agents/`.
- 9 end-to-end workflows under `workflows/` (new project, architecture
  review, feature development, code audit, SEO audit, article
  publishing, image generation, performance audit, production release).
- Machine-readable registry (`registry/`) generated from the skills on
  disk.
- Validation and tooling scripts: frontmatter, section, link, duplicate,
  provenance, and security checks; registry generation; skill installer
  for Claude Code, Cursor, Codex, and Antigravity.
- Continuous integration: skill validation, Markdown lint, and weekly
  security audit.
- Documentation: architecture, installation, agent compatibility,
  official sources, and update process.

[Unreleased]: https://github.com/luxmanbhattarai/SkillForge/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/luxmanbhattarai/SkillForge/releases/tag/v1.0.0
