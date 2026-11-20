---
name: cloudflare
description: >
  Use this skill when working with the Cloudflare platform: setting up a
  Cloudflare account, configuring DNS and custom domains, managing zones,
  configuring SSL/TLS, redirect, cache, and configuration rules,
  caching, WAF and security settings, and choosing between Cloudflare
  products such as Workers, Pages, D1, R2, KV, Queues, and Durable
  Objects. Trigger keywords: Cloudflare, DNS, zone, custom domain, SSL,
  TLS, WAF, cache, CDN, Cloudflare account, nameserver.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires a Cloudflare account and network access to the Cloudflare dashboard and API.
---

# Cloudflare

## Purpose

This skill covers the Cloudflare platform as a whole: account and zone setup,
DNS management, custom domains, SSL/TLS, caching, and security settings. It
helps an agent configure a domain on Cloudflare correctly and choose the right
Cloudflare product for a given workload.

## When to Use

- Setting up a new domain or moving an existing domain to Cloudflare DNS.
- Configuring SSL/TLS, caching, or WAF rules for a site behind Cloudflare.
- Choosing between Cloudflare products (Workers, Pages, D1, R2, KV, Queues,
  Durable Objects) for a new project.
- Debugging DNS, SSL, or caching problems on a Cloudflare-managed domain.
- Managing API tokens, account permissions, and multi-user access.

## When Not to Use

- Writing or deploying Worker code — use `cloudflare-workers` instead.
- Database, object storage, key-value, queue, or Durable Object specifics —
  use `cloudflare-d1`, `cloudflare-r2`, `cloudflare-kv`, `cloudflare-queues`,
  or `durable-objects` instead.
- Deploying to a non-Cloudflare host — use `vercel` or `deployment` instead.
- General CI automation — use `github-actions` or `ci-cd` instead.

## Prerequisites

- A Cloudflare account with access to the target zone.
- A registered domain name (for DNS and custom-domain work).
- For API or CLI work: an API token with the minimum scopes for the task,
  stored in a secret manager or environment variable, never in source files.
- Familiarity with DNS record types (A, AAAA, CNAME, MX, TXT, CAA).
- Page Rules are deprecated: do not create new ones. Use Redirect
  Rules (Single Redirects) for redirects, Cache Rules for caching,
  and Configuration Rules for per-path setting overrides; see the
  Page Rules migration guide linked below. Existing Page Rules still
  work and Cloudflare plans to migrate them automatically.

## Official Documentation

- [Cloudflare Docs](https://developers.cloudflare.com/) — the docs home for
  every Cloudflare product.
- [Cloudflare Dashboard](https://dash.cloudflare.com/) — account, zone, and
  DNS management.
- [Cloudflare API documentation](https://developers.cloudflare.com/api/) —
  REST API reference for programmatic management.
- [Page Rules migration guide](https://developers.cloudflare.com/rules/reference/page-rules-migration/) —
  how each Page Rules setting maps to a modern Rules product.

## Required Workflow

1. Identify the zone and the goal: DNS change, SSL setting, cache rule, or
   product selection.
2. Confirm the zone is active in the Cloudflare dashboard and note the
   current DNS records before changing anything.
3. For DNS changes, record the existing record set so a rollback is possible.
4. Make the smallest change that achieves the goal; avoid touching
   unrelated records or settings.
5. For SSL/TLS, prefer Full (Strict) mode when the origin has a valid
   certificate.
6. Verify the change with an independent check: `dig`, `curl -I`, or the
   dashboard's own status indicators.
7. Wait for DNS propagation where relevant, and re-verify after the change
   has taken effect.
8. Record what changed, in which zone, and how to roll it back.

## Implementation Standards

- Manage DNS records declaratively where possible: keep a record of intended
  records in the project repository (as documentation, not secrets).
- Never commit API tokens, API keys, or account IDs to source control.
- Use API tokens scoped to a single zone and the minimum permissions the
  task needs; avoid the global API key.
- Set the SSL/TLS encryption mode to Full (Strict) for any origin that
  serves a valid certificate; do not leave a zone on Flexible mode.
- Enable "Always Use HTTPS" so HTTP requests redirect to HTTPS.
- Keep the zone's nameservers at Cloudflare only after confirming the
  registrar change; a half-moved zone causes intermittent outages.
- Document the account, zone, and owner for every production domain in the
  project.

## Best Practices

- Use proxied (orange-cloud) records for web traffic so caching, WAF, and
  DDoS protection apply; use DNS-only records only for traffic that must
  bypass the proxy, such as mail servers.
- Add CAA records to restrict which certificate authorities may issue
  certificates for the domain.
- Use Cloudflare's managed challenge and bot fight settings rather than
  blocking all automated traffic, which breaks legitimate crawlers and APIs.
- Review the audit log after configuration changes in a shared account.
- For product selection, prefer the managed Cloudflare service that fits
  the data model: relational data goes to D1, objects to R2, small
  frequently-read values to KV, background jobs to Queues, and strongly
  consistent stateful coordination to Durable Objects.

## Security Considerations

- API tokens are credentials: scope them narrowly, rotate them, and revoke
  tokens that are no longer used.
- Never expose the origin server's IP address in public DNS; a DNS-only
  record for the origin bypasses Cloudflare protection.
- Use WAF managed rules and rate limiting for public endpoints, and review
  WAF events regularly for abuse patterns.
- Restrict dashboard access by role; give collaborators the lowest role
  that lets them do their job.
- Be careful with redirect, transform, and configuration rules that
  modify headers or redirect traffic, since a bad rule can expose or
  break the origin.

## Performance Considerations

- Cloudflare caches static assets at the edge; set sensible cache rules and
  use cache purging after deployments that change asset content.
- Use HTTP/3 and Brotli compression where the plan supports them; both are
  dashboard toggles.
- Keep DNS TTLs low (for example 300 seconds) during migrations, and raise
  them after the change is stable.
- Avoid excessive redirect rules and redirects; each redirect adds a
  round trip.

## Common Mistakes

- Leaving SSL/TLS on Flexible mode — traffic between Cloudflare and the
  origin is unencrypted; use Full (Strict) instead.
- Creating a DNS-only A record that points at the origin IP — this bypasses
  all Cloudflare protection and leaks the origin address.
- Using the global API key in automation — use a scoped API token instead.
- Forgetting to update DNS after a deployment moves the site to a new
  host — the old records keep pointing at the retired origin.
- Assuming DNS changes are instant — propagation and TTL caching can delay
  visibility; verify with `dig` against multiple resolvers.

## Examples

Check the current DNS records for a domain before changing them:

```bash
dig +short example.com A
dig +short example.com AAAA
dig +short www.example.com CNAME
```

Verify that a site is served over HTTPS through Cloudflare:

```bash
curl -I https://example.com
```

The response headers should show an HTTP/2 or HTTP/3 response with
Cloudflare server headers. Confirm the certificate is valid and the
redirect from HTTP to HTTPS works:

```bash
curl -I http://example.com
```

## Validation Checklist

- [ ] The zone is active and the domain resolves to the intended records.
- [ ] SSL/TLS mode is Full (Strict) and HTTPS redirects are in place.
- [ ] The change was verified with `dig` or `curl` after propagation.
- [ ] No API token or account secret appears in source control.
- [ ] The change and its rollback steps are documented.

## Expected Deliverables

- The Cloudflare configuration change (DNS records, SSL/TLS setting, rule,
  or product choice) applied and verified.
- A short summary of what changed, in which zone, and how to roll it back.
- Any project documentation updated to record the account, zone, and owner.

## References

- [Cloudflare Docs](https://developers.cloudflare.com/) — product and
  configuration documentation.
- [Cloudflare API documentation](https://developers.cloudflare.com/api/) —
  REST API reference.
- Related skills in this repository: `cloudflare-workers`, `cloudflare-d1`,
  `cloudflare-r2`, `cloudflare-kv`, `cloudflare-queues`, `durable-objects`,
  `deployment`, `observability`.
