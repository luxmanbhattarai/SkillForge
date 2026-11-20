---
name: self-hosted-vps
description: >
  Use this skill when setting up and operating an application on a
  self-hosted virtual private server: provisioning a Linux server,
  hardening SSH, configuring a firewall, running a reverse proxy
  (Caddy or Nginx) with automatic TLS, deploying with Docker Compose,
  running a database, setting up monitoring and backups, scaling a
  single server, and rolling back a bad deploy. Trigger keywords: VPS,
  self-hosted, server setup, SSH hardening, UFW, firewall, Caddy,
  Nginx, reverse proxy, TLS, Let's Encrypt, Docker Compose, deploy,
  backup, fail2ban, hardening, bare metal.
license: MIT
metadata:
  version: "1.0.0"
  category: infrastructure
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
compatibility: Requires root or sudo access to a Linux VPS (Ubuntu LTS or Debian stable) and a domain name for TLS.
---

# Self-Hosted VPS

## Purpose

This skill covers running an application on a self-hosted virtual
private server: provisioning and hardening a Linux server, serving the
app behind a reverse proxy with automatic TLS, deploying with Docker
Compose, running a database, monitoring the server, backing it up, and
rolling back a bad deploy. It produces a single-server deployment that
is hardened, observable, backed up, and reversible — with its scaling
limits stated honestly.

## When to Use

- Provisioning a new Linux VPS for an application.
- Hardening SSH, the firewall, and the operating system.
- Serving an app behind Caddy or Nginx with automatic TLS.
- Deploying an application with Docker Compose.
- Running PostgreSQL or another database on the server.
- Setting up monitoring, log rotation, and alerting.
- Setting up backups and testing a restore.
- Scaling a single server (vertical) and deciding when to move on.
- Rolling back a deploy on a server you control.

## When Not to Use

- Deploying to a managed platform — use `vercel`, `railway`, `render`,
  `fly-io`, or `cloudflare-workers` instead.
- Container image authoring in depth — use `docker`.
- General deployment strategy — use `deployment`.
- Designing the CI pipeline that deploys — use `github-actions` or
  `ci-cd`.
- Kubernetes or multi-server orchestration — that is out of scope for a
  single-server skill; use `kubernetes` when the workload outgrows one
  server.
- Database schema design — use `database-design` and `postgresql`.

## Prerequisites

- A VPS with root or sudo access. Use a current Ubuntu LTS (26.04 as
  of 2026-11-20) or Debian stable; avoid end-of-life releases.
- A domain name whose DNS you control, with an A (and AAAA, when the
  server has IPv6) record pointing at the server, for TLS.
- SSH access from your own machine with a key pair; generate one with
  `ssh-keygen -t ed25519` before provisioning if you do not have one.
- The application builds and runs locally, preferably from a Dockerfile
  (see `docker`), so the server runs the same image you tested.
- Docker Engine and Docker Compose v2 installed on the server, or a
  plan to install them from Docker's official packages.
- Current stable as of 2026-11-20. Caddy is the recommended reverse
  proxy for a new setup because it provisions and renews TLS
  certificates automatically; Nginx is the alternative when its
  ecosystem or specific modules are required.

## Official Documentation

- [Ubuntu Server: OpenSSH server](https://ubuntu.com/server/docs/how-to/security/openssh-server/) —
  installing and configuring OpenSSH, including key authentication.
- [Ubuntu Server: Firewall](https://ubuntu.com/server/docs/how-to/security/firewalls/) —
  UFW, the default firewall configuration tool for Ubuntu.
- [Caddy: reverse_proxy (Caddyfile directive)](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) —
  the reverse proxy directive: upstreams, load balancing, health
  checks, and headers.
- [Caddy: Common Caddyfile Patterns](https://caddyserver.com/docs/caddyfile/patterns) —
  minimal Caddyfile configurations for reverse proxies, static sites,
  and SPAs.
- [Caddy: Reverse proxy quick-start](https://caddyserver.com/docs/quick-starts/reverse-proxy) —
  getting a production-ready reverse proxy running quickly.
- [NGINX: Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) —
  configuring NGINX as a reverse proxy with `proxy_pass`.
- [Docker Docs](https://docs.docker.com/) — Docker Engine, Dockerfiles,
  and Compose.

## Required Workflow

1. Provision the server with a current Ubuntu LTS or Debian stable
   image, and update it immediately:
   `sudo apt update && sudo apt full-upgrade -y`, then reboot if a new
   kernel was installed.
2. Create a named admin user with sudo rights and disable direct root
   work:
   `sudo adduser <name>` then `sudo usermod -aG sudo <name>`.
3. Set up SSH key authentication: copy your Ed25519 public key to the
   new user's `~/.ssh/authorized_keys` (permissions `700` on `.ssh`,
   `600` on `authorized_keys`), and confirm you can log in as that
   user before changing anything else.
4. Harden SSH with a drop-in file in `/etc/ssh/sshd_config.d/`:
   `PermitRootLogin no`, `PasswordAuthentication no`,
   `PubkeyAuthentication yes`, `PermitEmptyPasswords no`,
   `MaxAuthTries 3`. Validate with `sudo sshd -t`, then restart with
   `sudo systemctl restart ssh.service`. Keep the current SSH session
   open while testing a new login in a second session.
5. Configure the firewall with UFW: allow SSH first, then HTTP and
   HTTPS, then enable it:
   `sudo ufw allow OpenSSH`, `sudo ufw allow 80,443/tcp`,
   `sudo ufw default deny incoming`, `sudo ufw default allow outgoing`,
   `sudo ufw enable`. Verify with `sudo ufw status verbose`.
6. Install fail2ban to ban repeated failed logins, and confirm
   automatic security updates are enabled (`unattended-upgrades` is
   installed by default on Ubuntu).
7. Point the domain's A record at the server and confirm it resolves
   (`dig +short example.com`) before starting the reverse proxy; ACME
   certificate issuance requires DNS to resolve first.
8. Install Caddy from its official APT repository (or Nginx, when
   required) and write the reverse proxy configuration for the app.
   Validate the config (`sudo caddy validate` or `sudo nginx -t`)
   before reloading.
9. Install Docker Engine and Compose v2 from Docker's official
   packages, add the admin user to the `docker` group, and confirm
   `docker run hello-world` works.
10. Deploy the application with Docker Compose: app service, database
    service with a named volume, and a shared network. Keep the
    database port unpublished (reachable only inside the Compose
    network) unless there is a specific reason to expose it.
11. Verify end to end: the domain responds over HTTPS, the app's health
    endpoint returns 200, and the database is reachable from the app
    but not from the public internet.
12. Set up backups before the first real users arrive: scheduled
    database dumps, volume backups, and an off-server copy. Test a
    restore.
13. Set up monitoring: disk, memory, CPU, service health, and TLS
    expiry, plus an external uptime check.

## Implementation Standards

- Never work as root for daily administration; use the named sudo user.
- Never allow password SSH authentication on a public server once key
  authentication works; keys are far harder to guess than passwords.
- The firewall allows only what the server serves: SSH, HTTP, and
  HTTPS by default. Database ports, admin panels, and internal tools
  are never exposed to the public internet.
- The reverse proxy is the only process listening on ports 80 and 443;
  the application listens on localhost or inside the Docker network
  only.
- Secrets live in an environment file with `0600` permissions on the
  server (or in a secret manager), never in the Compose file, the
  image, or the repository.
- Containers run as a non-root user where the image supports it, and
  with resource limits so one container cannot starve the host.
- Database data lives in a named Docker volume, never inside the
  container filesystem; the volume is part of the backup plan.
- Every deploy is traceable: tag images with the Git commit SHA, and
  keep the previous image available so a rollback is a redeploy, not a
  rebuild.
- Make database migrations backward compatible: a rollback redeploys
  the old image, not the old schema.
- Keep the server's configuration in version control (Caddyfile,
  Compose file, hardening scripts) so the server can be rebuilt from
  scratch; the server itself is replaceable, the data is not.

### Testing Strategy

- Test the backup by restoring it: on a schedule, restore the
  database volume backup to a scratch server and confirm the
  application starts and serves real data — a backup never
  restored is a backup never proven.
- Test the rebuild from version control: a fresh server built
  only from the committed Caddyfile, Compose file, and
  hardening scripts reaches a working state with no manual
  steps.
- Test the rollback before needing it: redeploy the previous
  image (tagged with its Git commit SHA) against the current
  schema and confirm the old code runs, proving the migration
  was backward compatible.
- Test the firewall from outside: a port scan of the public
  address shows only SSH, HTTP, and HTTPS, and database ports
  and admin panels are unreachable.
- Test deploys on a staging path first: the new image runs
  behind the reverse proxy on a non-production host or port,
  and the health check passes before traffic moves to it.

## Best Practices

- Prefer Caddy for a new setup: a domain name in the Caddyfile is
  enough for a valid, auto-renewing TLS certificate, with no separate
  ACME client, renewal cron job, or certificate paths to manage.
- Use `caddy reload` (or `nginx -s reload`) to apply configuration
  changes without dropping connections; validate first, every time.
- Keep the application and the database in one Compose project with
  `depends_on` and healthchecks, so `docker compose up -d` starts the
  whole stack in order.
- Run the database's backup on a schedule (a systemd timer or cron
  job), copy the dumps off the server, and test a restore on a
  schedule — an untested backup is a hope, not a backup.
- Rotate logs (journald and container logs) so a chatty service cannot
  fill the disk; monitor disk usage and alert before it hits 80%.
- Take a provider snapshot before a risky change (major upgrade,
  migration, proxy reconfiguration); snapshots complement, but do not
  replace, application-level backups.
- Document the server: its provider, IP addresses, users, open ports,
  services, backup locations, and the rollback procedure, in the
  project repository.

## Security Considerations

- SSH is the front door: key-only authentication, no root login, a
  short `MaxAuthTries`, and fail2ban watching for brute-force attempts.
  Consider restricting SSH to known IP addresses in the firewall when
  the admin team has stable IPs.
- Keep the operating system patched: enable automatic security updates
  and apply other updates on a schedule; reboot when a kernel update
  requires it.
- Never publish the database port to the host; reach the database over
  the Compose network, or through an SSH tunnel from your own machine.
- Disable or remove services the server does not need; every listening
  port is attack surface. Check with `ss -tlnp`.
- Set security headers at the reverse proxy (HSTS, `X-Content-Type-
  Options: nosniff`, `X-Frame-Options`, a restrictive
  `Content-Security-Policy` where the app supports it); see
  `secure-headers`.
- Do not run the Caddy admin API on a public interface; bind it to
  localhost or disable it in production.
- Protect the server's backups: encrypt dumps that leave the server,
  and restrict access to the backup destination.
- Audit access regularly: who has an SSH key, who has sudo, and which
  services run as which user. Remove access the day it is no longer
  needed.

## Performance Considerations

- A single server has hard scaling limits: vertical scaling (a bigger
  instance) works until the provider's largest size, and then the app
  must go multi-server with a load balancer and shared state. Plan the
  exit before traffic forces it.
- The database and the app share one machine's CPU, memory, and disk;
  size the instance for both, and watch memory pressure — a host that
  runs out of memory kills processes unpredictably.
- Use the reverse proxy for what it is good at: TLS termination,
  compression, static file serving, and caching headers, so the app
  spends its CPU on application work.
- Keep the Docker build context small with `.dockerignore`; a large
  context slows every deploy.
- Use a CDN in front of the server for static assets and to absorb
  traffic spikes when the app serves a global audience; see
  `cloudflare`.
- Monitor disk I/O and disk space: a full disk stops the database
  first, and a slow disk makes everything slow. Prefer SSD-backed
  storage from the provider.

## Common Mistakes

- Enabling the firewall before allowing SSH — the server locks you out
  and the only recovery is the provider's console.
- Changing SSH configuration and restarting without testing a new
  login in a second session — a bad config locks you out; keep the
  first session open until the new login works.
- Leaving password authentication enabled — automated scanners try
  passwords against every public SSH server, constantly.
- Exposing the database port publicly — databases are not designed to
  face the internet; keep them on the private network or behind SSH.
- Starting Caddy before DNS resolves — ACME issuance fails until the
  domain points at the server; check with `dig` first.
- Storing data inside the container filesystem — it is lost when the
  container is recreated; use a named volume.
- Baking secrets into the image or committing the `.env` file —
  secrets in image layers persist in image history.
- No backups, or backups never tested — the first restore attempt
  should not be during an incident.
- Running everything as root — a compromised process then has full
  control of the host.
- Skipping the `nginx -t` or `caddy validate` step — a bad config
  takes the proxy down on reload.

## Examples

Harden SSH with a drop-in configuration file:

```ini
# /etc/ssh/sshd_config.d/hardening.conf
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
MaxAuthTries 3
LoginGraceTime 30
```

```bash
sudo sshd -t
sudo systemctl restart ssh.service
```

Minimal UFW setup (allow SSH before enabling):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
sudo ufw status verbose
```

A minimal Caddyfile: automatic HTTPS and a reverse proxy to the app:

```caddyfile
example.com {
    reverse_proxy localhost:3000
}
```

Apply it without dropping connections:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

The same proxy in Nginx, with TLS provided by Certbot:

```nginx
server {
    listen 80;
    server_name example.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

A Compose file for the app and its database:

```yaml
services:
  app:
    image: my-app:${APP_VERSION:-latest}
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  db-data:
```

Deploy a new version, and roll back to the previous one:

```bash
# Deploy: pull the new image and recreate the app container
APP_VERSION=<new-commit-sha> docker compose up -d app

# Roll back: redeploy the previous known-good image
APP_VERSION=<previous-commit-sha> docker compose up -d app
```

Back up the database on a schedule (systemd timer or cron):

```bash
docker compose exec -T db pg_dump -U postgres mydb | gzip > /var/backups/mydb-$(date +%F).sql.gz
```

## Validation Checklist

- [ ] SSH works with keys only; root login and password authentication
      are disabled, and a second login session was tested.
- [ ] The firewall is enabled and allows only SSH, HTTP, and HTTPS.
- [ ] fail2ban is running and automatic security updates are enabled.
- [ ] The domain resolves to the server and serves HTTPS with a valid
      certificate.
- [ ] The app responds on its health endpoint through the reverse proxy.
- [ ] The database is not reachable from the public internet.
- [ ] Backups run on a schedule, are stored off the server, and a
      restore has been tested.
- [ ] The previous image is available and the rollback procedure is
      documented.
- [ ] Monitoring covers disk, memory, CPU, service health, and TLS
      expiry.

## Expected Deliverables

- The hardened server, documented with its provider, IPs, users, and
  open ports.
- The reverse proxy configuration and the Compose file, committed to
  the project repository.
- The application deployed and verified over HTTPS.
- A working backup and restore procedure, tested at least once.
- Documentation of the deploy, rollback, and incident steps for the
  server.

## References

- [Ubuntu Server: OpenSSH server](https://ubuntu.com/server/docs/how-to/security/openssh-server/) —
  OpenSSH configuration and key authentication.
- [Ubuntu Server: Firewall](https://ubuntu.com/server/docs/how-to/security/firewalls/) —
  UFW firewall configuration.
- [Caddy: reverse_proxy (Caddyfile directive)](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) —
  reverse proxy configuration.
- [Caddy: Common Caddyfile Patterns](https://caddyserver.com/docs/caddyfile/patterns) —
  minimal Caddyfile examples.
- [NGINX: Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/) —
  NGINX reverse proxy configuration.
- [Docker Docs](https://docs.docker.com/) — Docker Engine and Compose.
- Related skills in this repository: `deployment`, `docker`, `ci-cd`,
  `github-actions`, `observability`, `secrets-management`,
  `secure-headers`, `backup-recovery`, `postgresql`, `cloudflare`,
  `railway`, `render`, `fly-io`.
