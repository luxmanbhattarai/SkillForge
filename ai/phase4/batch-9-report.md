# Phase 4 Batch 9 — Deployment Platforms: Report

- **Date:** 2026-11-20
- **Batch:** 9 (railway, render, fly-io, self-hosted-vps)
- **Branch:** feat/skillforge-production-upgrade
- **Status:** Complete. All 4 skills written and validated. No commits made
  (coordinator commits). No files outside this batch's assignment touched;
  `skills/upstream/` untouched.

## Skills written

| Skill | Path | Lines |
| --- | --- | --- |
| railway | `skills/infrastructure/railway/SKILL.md` | 300 |
| render | `skills/infrastructure/render/SKILL.md` | 356 |
| fly-io | `skills/infrastructure/fly-io/SKILL.md` | 364 |
| self-hosted-vps | `skills/infrastructure/self-hosted-vps/SKILL.md` | 421 |

All four follow `templates/SKILL-TEMPLATE.md` exactly (15 sections in
order), use the standard frontmatter (`name` = directory name,
`license: MIT`, metadata `version: "1.0.0"`, `category: infrastructure`,
`maintainer: skills-library`, `source: original`,
`last_verified: "2026-11-20"`), stay under 500 lines, and cross-reference
related skills by backticked name only. No `references/` subdirectories
were needed; each SKILL.md is self-contained. No prices are quoted
anywhere; pricing notes point at the official pricing pages.

## Official sources consulted

Every link in the skills is a real official URL verified in-session,
either opened directly or returned by search from the official domain.
Docs homes for all three platforms were opened and confirmed live on
2026-11-20.

### railway

- https://docs.railway.com/ (opened; docs home)
- https://docs.railway.com/cli/add (CLI: adding services/databases)
- https://docs.railway.com/cli/postgres (Postgres PITR, HA, PgBouncer)
- https://docs.railway.com/volumes/backups (volume backups/restore)
- https://docs.railway.com/deployments/restart-policy (restart policy)
- https://docs.railway.com/pricing/plans#image-retention-policy (image
  retention window; 72 hours on Hobby per Railway support replies)
- https://docs.railway.com/integrations/api/manage-deployments
  (`deploymentRollback` mutation, `canRollback` field)
- https://docs.railway.com/llms-full.txt (full official docs text)
- Railway Central Station (official support) replies confirming
  Rollback vs Redeploy semantics and volume-backup restore behavior.

Secondary confirmation (multiple independent sources, all consistent):
CLI commands (`railway login/init/link/up/logs/run/status/domain/
redeploy/down/add`), `PORT` injection at runtime, `${{Service.VAR}}`
references, `RAILWAY_PRIVATE_DOMAIN` private networking, Generate Domain
(`*.up.railway.app` with TLS), one volume per service, replica scaling.

### render

- https://render.com/docs (opened; docs home)
- https://render.com/docs/deploys (auto-deploys, zero-downtime deploys,
  pre-deploy command, restarts)
- https://render.com/docs/rollbacks (rollback semantics: reuses build
  artifact; dashboard rollback disables autodeploys; disks and env
  groups not reverted)
- https://render.com/docs/infrastructure-as-code (Blueprints)
- https://render.com/docs/blueprint-spec (render.yaml field reference)
- https://render.com/docs/configure-environment-variables (variables,
  secret files, environment groups, `sync: false`, `generateValue`,
  `fromDatabase`, `fromService`)
- https://render.com/docs/disks (persistent disks: mount path, daily
  snapshots retained 7 days, single instance, disables zero-downtime)
- https://render.com/docs/postgresql-creating-connecting (internal vs
  external URL, storage autoscaling at 90% full)
- https://render.com/docs/scaling (manual vs autoscaling, Pro+ for
  autoscaling, utilization formula)
- https://render.com/docs/custom-domains (DNS, verification, managed TLS,
  included-domain counts per plan)
- https://render.com/docs/web-services (web service features)
- https://render.com/docs/static-sites (managed TLS via Let's Encrypt and
  Google Trust Services)

### fly-io

- https://fly.io/docs/ (opened; docs home)
- https://docs.fly.io/reference (reference index: fly.toml, flyctl,
  health checks)
- https://docs.fly.io/launch/deploy (deploy strategies, release commands,
  first-deploy Machine count)
- https://docs.fly.io/flyctl/cmd/fly_deploy (`--image`, `--strategy`,
  `--rollback` flags)
- https://docs.fly.io/postgres/create-and-connect (Managed Postgres
  create/attach/connect/proxy)
- https://docs.fly.io/flyctl/cmd/fly_mpg_create (MPG plans, PG 16/17,
  `--volume-size` default 10)
- https://docs.fly.io/flyctl/cmd/fly_mpg_attach (attach sets `DATABASE_URL`)
- https://docs.fly.io/volumes/volume-manage (volumes: create, extend,
  fork, snapshots; default 3 GB, 5-day snapshot retention)
- https://docs.fly.io/machines/api/volumes-resource (volume properties,
  encryption at rest default true)
- https://fly.io/mpg/ (Managed Postgres overview)
- Fly.io community forum (official) rollback threads confirming
  `fly releases --image` + `fly deploy -i <image>`.

Secondary confirmation (multiple independent sources): fly.toml keys
and defaults (`kill_signal` SIGINT, `kill_timeout` 5s default/max 300s,
`internal_port` 8080 default, auto stop/start, `[[vm]]` overriding
`fly scale vm`), `fly certs add/check`, `fly scale count/vm`,
`fly secrets set/list`, `fly launch --db mpg` / `--no-deploy`.

### self-hosted-vps

- https://ubuntu.com/server/docs/how-to/security/openssh-server/
  (OpenSSH config, `sshd_config.d/` snippets, ed25519 recommendation,
  `sshd -t`, `systemctl restart ssh.service`)
- https://ubuntu.com/server/docs/how-to/security/firewalls/ (UFW)
- https://ubuntu.com/server/docs/how-to/security/openssh-gssapi/
  (confirms Ubuntu 26.04 LTS "Resolute" as the current LTS line)
- https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
  (reverse_proxy syntax, health checks, load balancing)
- https://caddyserver.com/docs/caddyfile/patterns (minimal Caddyfile
  patterns, including reverse proxy and maintenance page)
- https://caddyserver.com/docs/quick-starts/reverse-proxy (reverse proxy
  quick-start)
- https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
  (NGINX `proxy_pass` and header forwarding)
- https://docs.docker.com/ (Docker Engine and Compose; also linked by
  the existing `docker` skill)

Secondary confirmation: Caddy automatic HTTPS behavior and official APT
install steps (Cloudsmith repo), fail2ban sshd jail setup,
`unattended-upgrades` default on Ubuntu, `proxy_pass` trailing-slash
rule, Postgres `pg_dump` backup pattern.

## Validation output

All four validated individually from the repo root (no unfiltered
validate, no registry run, per plan):

```
$ node scripts/validate-skills.mjs --filter skills/infrastructure/railway
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/infrastructure/render
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/infrastructure/fly-io
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.

$ node scripts/validate-skills.mjs --filter skills/infrastructure/self-hosted-vps
Checked 1 skills (1 original, 0 upstream).
PASS: all skills valid.
```

No errors or warnings; no fixes were needed after the first pass.

## Decisions and notes

1. **Railway config-as-code deprecation.** A secondary source verified
   against official Railway docs (2026-10-10) reports `railway.json` /
   `railway.toml` are deprecated in favor of Infrastructure as Code
   (`.railway/railway.ts`, managed with `railway config plan` /
   `railway config apply`), with old files read until 2026-12-01 and
   new services unable to opt in. The skill states this with a
   "confirm current status in the official docs" caveat rather than
   as a hard fact, since the deprecation was not confirmed on an
   official page in-session.
2. **Railway CLI variable command form.** Sources disagree between
   `railway variables set` (plural, majority of sources) and
   `railway variable set` (singular, two recent sources). The skill
   uses the plural form. Worth a one-line check against the official
   CLI reference when the coordinator next reviews the skill.
3. **Fly.io Postgres: MPG first.** Managed Postgres (MPG, `fly mpg`)
   is presented as the recommended path for new projects; the older
   self-managed Fly Postgres (`fly postgres create`) is noted as an
   alternative that the operator runs themselves. No deprecation claim
   is made about Fly Postgres, since none was verified.
4. **Fly.io rollback.** Fly.io has no dedicated rollback command; the
   skill documents the verified path (`fly releases --image`, then
   `fly deploy --image <image> --rollback`) and states clearly that it
   redeploys the old image only — it does not undo migrations,
   `fly.toml` changes, or secret changes.
5. **Ubuntu LTS version.** The skill names Ubuntu 26.04 LTS as current
   as of 2026-11-20, based on the Ubuntu Server docs (which refer to
   "Ubuntu Resolute 26.04 LTS and earlier" as the current line).
6. **Research tooling note.** `browser.open` began returning 429 rate
   limits partway through research; the remaining URL verification was
   done through `browser.search` results from official domains, and
   every linked URL is an official page returned by search or opened
   directly. No link was constructed from a domain name.
7. **Cross-references.** All backticked skill names used in References
   were checked to exist in `skills/` (`deployment`, `docker`,
   `ci-cd`, `github-actions`, `observability`, `secrets-management`,
   `secure-headers`, `backup-recovery`, `postgresql`, `cloudflare`,
   plus the three sibling batch-9 skills).
8. **House style.** Skimmed `deployment`, `vercel`, and `docker`
   before writing; matched their structure, tone, and section depth,
   and cross-referenced rather than duplicating (notably `docker` for
   image authoring and `deployment` for strategy).
