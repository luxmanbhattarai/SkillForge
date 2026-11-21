# Phase 4 — Skills Expansion: Plan

- **Date:** 2026-11-20
- **Baseline:** 226 skills (177 original + 49 upstream), 16 categories.
- **Target:** ~51 new original skills + 2 extensions. New categories:
  `desktop`, `ai-engineering`.

## Extend-vs-create decisions

Checked against `registry/skills.json` + `skills/` directories
(2026-11-20). "Create" = new skill directory; "Extend" = add to an
existing skill (no new directory).

| Requested item | Decision | Rationale |
| --- | --- | --- |
| NestJS | Create `backend/nestjs` | Not covered. |
| Fastify | Create `backend/fastify` | Not covered. |
| Express | Create `backend/express` | Not covered. |
| Advanced API Architecture | Create `backend/advanced-api-architecture` | Capstone skill composing `api-design`, `rest-api`, `graphql`, `rate-limiting`, `queues`, `background-jobs`, `caching`, `api-documentation`; covers versioning, idempotency, webhooks, observability, distributed systems. References siblings, does not repeat them. |
| React Native | Create `frontend/react-native` | Not covered. |
| Expo | Create `frontend/expo` | Not covered; distinct from React Native (managed workflow). |
| SvelteKit | Create `frontend/sveltekit` | Not covered. |
| Vue | Create `frontend/vue` | Not covered. |
| Nuxt | Create `frontend/nuxt` | Not covered; distinct from Vue (meta-framework). |
| Tauri 2 | Create `desktop/tauri` | Not covered. Name `tauri`; version 2 in body. |
| Rust | Create `desktop/rust` | Not covered. Modern Rust practices, Tauri/desktop emphasis, general enough to stand alone. |
| Electron | Create `desktop/electron` | Not covered. |
| Redis | Create `database/redis` | Not covered. |
| Elasticsearch | Create `database/elasticsearch` | Not covered. |
| OpenSearch | Create `database/opensearch` | Not covered; distinct from Elasticsearch (fork, licensing, API drift). |
| ClickHouse | Create `database/clickhouse` | Not covered. |
| Auth.js | Create `auth/authjs` | Not covered. Name `authjs` (Auth.js). |
| Clerk | Create `auth/clerk` | Not covered. |
| Supabase Auth | Create `auth/supabase-auth` | Not covered. |
| Passkeys | Create `auth/passkeys` | Not covered as its own skill (`mfa` covers MFA broadly; passkeys/WebAuthn deserve depth). |
| AWS | Create `infrastructure/aws` | Not covered. |
| Google Cloud Platform | Create `infrastructure/gcp` | Not covered. Name `gcp`. |
| Kubernetes | Create `infrastructure/kubernetes` | Not covered. |
| Terraform | Create `infrastructure/terraform` | Not covered. |
| Pulumi | Create `infrastructure/pulumi` | Not covered. |
| Railway | Create `infrastructure/railway` | Not covered. |
| Render | Create `infrastructure/render` | Not covered. |
| Fly.io | Create `infrastructure/fly-io` | Not covered. |
| Self-hosted VPS | Create `infrastructure/self-hosted-vps` | Not covered. |
| Nx | Create `architecture/nx` | Not covered. |
| Changesets | Create `architecture/changesets` | Not covered. |
| Release Management | Create `architecture/release-management` | Process skill; distinct from `changelog-management` (docs) and `package-development` (publishing mechanics). |
| Workspace Dependency Governance | Extend `architecture/dependency-management` | `dependency-management` + `package-boundaries` + `pnpm-workspaces` already cover the ground; add a workspace-governance section (constraints, workspace protocol, dedup) instead of a near-duplicate skill. |
| TypeScript SDK | Create `backend/typescript-sdk` | `sdk-development` is language-agnostic; TS-specific tooling (tsup, publint, attw, dual CJS/ESM) justifies a focused skill. |
| Python SDK | Create `backend/python-sdk` | Same; Python-specific tooling (hatchling, typing, packaging). |
| API Client Generation | Create `backend/api-client-generation` | Not covered. |
| OpenAPI | Create `backend/openapi` | Not covered (`api-documentation` is about docs generally). |
| LLM Integration | Create `ai-engineering/llm-integration` | New category `ai-engineering`. Not covered. |
| RAG | Create `ai-engineering/rag` | Not covered. |
| AI Agents | Create `ai-engineering/ai-agents` | Not covered. |
| MCP Security | Create `ai-engineering/mcp-security` | Distinct from `backend/mcp-development` (building) — this is the security half. |
| Agent Evaluation | Create `ai-engineering/agent-evaluation` | Not covered. |
| Entity SEO | Create `seo/entity-seo` | Not covered. |
| Topical Authority | Create `seo/topical-authority` | Not covered. |
| Content Decay | Create `seo/content-decay` | Diagnostic side (detect/measure decay); `content-refresh` is the rewrite workflow. Cross-reference, do not duplicate. |
| SERP Monitoring | Create `seo/serp-monitoring` | Ongoing tracking; distinct from `serp-analysis` (point-in-time). |
| Editorial Workflow | Create `content/editorial-workflow` | End-to-end pipeline with roles/approvals; distinct from `editorial-review` (the review step) and `content-brief`. |
| Source Verification | Create `content/source-verification` | Source vetting/credibility/citations; distinct stage from `fact-checking` (claim checking). Cross-reference. |
| Content Brief Automation | Inspect `content/content-brief` first; extend unless separation is justified | Brief automation (schemas, generators, SERP-derived briefs) may fit as a section of `content-brief`. Batch 12 decides and records the reason. If created: `content/content-brief-automation`. |
| Satori | Create `media/satori` | Not covered. |
| Resvg | Create `media/resvg` | Not covered. |
| Sharp | Create `media/sharp` | Not covered. |
| Platform-specific Social Images | Create `media/platform-social-images` | Consolidating per-platform dimensions/behavior; existing `social-preview`/`twitter-card-images`/`og-image-generation` cover pieces. Must NOT assume uniform dimensions. |

## Batches (disjoint skill directories)

| Batch | Skills | Directories |
| --- | --- | --- |
| 1 | nestjs, fastify, express, advanced-api-architecture | skills/backend/ |
| 2 | typescript-sdk, python-sdk, api-client-generation, openapi | skills/backend/ |
| 3 | react-native, expo, sveltekit, vue, nuxt | skills/frontend/ |
| 4 | tauri, rust, electron | skills/desktop/ (new) |
| 5 | nx, changesets, release-management + extend dependency-management | skills/architecture/ |
| 6 | redis, elasticsearch, opensearch, clickhouse | skills/database/ |
| 7 | authjs, clerk, supabase-auth, passkeys | skills/auth/ |
| 8 | aws, gcp, kubernetes, terraform, pulumi | skills/infrastructure/ |
| 9 | railway, render, fly-io, self-hosted-vps | skills/infrastructure/ |
| 10 | llm-integration, rag, ai-agents, mcp-security, agent-evaluation | skills/ai-engineering/ (new) |
| 11 | entity-seo, topical-authority, content-decay, serp-monitoring | skills/seo/ |
| 12 | editorial-workflow, source-verification, satori, resvg, sharp, platform-social-images + content-brief-automation decision | skills/content/, skills/media/ |

## Shared rules for all batches

- Read `templates/SKILL-TEMPLATE.md`, `docs/SKILL-STANDARDS.md`, and
  `ai/decisions/2026-11-20-phase3-version-metadata.md` first.
- Research official docs first per technology (hierarchy: official docs
  > official API refs > official repos/release notes > migration guides
  > standards > reputable secondary). Current stable versions only; never
  fabricate versions, URLs, CLI flags, package methods, or stats.
- `last_verified: "2026-11-20"` (the real verification date). Version
  info in the body (Prerequisites / Official Documentation sections),
  never as new frontmatter fields.
- Frontmatter: `name` = directory name; `description` ≤1024 chars with
  trigger keywords; `license: MIT`; metadata `version: "1.0.0"`,
  `category`, `maintainer: skills-library`, `source: original`,
  `last_verified: "2026-11-20"`.
- Body: template sections in order; SKILL.md <500 lines; long material
  in `references/`; real minimal examples; Security + Performance
  sections; Common Mistakes; Validation Checklist; References with
  related skills by backticked name (never file paths).
- NEVER touch `skills/upstream/` or any directory outside the batch's
  assignment. No commits (coordinator commits per group).
- Validate each new skill with
  `node scripts/validate-skills.mjs --filter skills/<cat>/<name>`
  and fix errors in your own files. Do NOT run unfiltered validate or
  `npm run registry` (registry consistency fails until the coordinator
  regenerates once at the end).
- Write `ai/phase4/batch-N-report.md`: skills written, official sources
  consulted per skill, validation output, decisions/notes.

## Also in Phase 4 (coordinator, not batches)

- Marketingskills `tools/` selective import (11 files) — see
  `ai/decisions/2026-11-20-marketingskills-tools-import.md`.
- Upstream sibling-skills mapping documentation — see
  `ai/decisions/2026-11-20-upstream-sibling-skills.md`.
- Registry regeneration + full validation suite once all batches land.
