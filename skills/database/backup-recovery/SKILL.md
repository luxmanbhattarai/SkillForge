---
name: backup-recovery
description: >
  Back up and restore databases reliably: backup strategies, point-in-time
  recovery, restore testing, and disaster recovery planning. Use when
  setting up backups, choosing a recovery point and recovery time objective,
  testing a restore, recovering from data loss, or planning for database
  failure. Trigger keywords: backup, restore, recovery, point-in-time
  recovery, PITR, disaster recovery, RPO, RTO, pg_dump, mysqldump.
license: MIT
metadata:
  version: "1.0.0"
  category: database
  maintainer: skills-library
  source: original
  last_verified: "2026-11-20"
---

# Backup and Recovery

## Purpose

This skill covers reliable database backup and recovery: choosing a backup strategy that matches the recovery objectives, automating backups, and — most importantly — proving restores work by testing them regularly. A backup that has never been restored is a hope, not a plan.

## When to Use

- Setting up backups for a new database.
- Choosing a recovery point objective (RPO) and recovery time objective (RTO).
- Setting up point-in-time recovery (PITR) or continuous archiving.
- Testing whether a backup actually restores.
- Recovering from accidental deletion, corruption, or a failed migration.
- Planning for a full database failure or a provider outage.
- Reviewing whether existing backups are sufficient.

## When Not to Use

- When the task is only about schema changes — use `migrations` (but take a backup before a destructive migration).
- When the task is only about access control or encryption — use `database-security`.
- When the task is only about query speed — use `sql-optimization`.
- When the database is SQLite and the question is only about copying the file safely — use `sqlite` alongside this skill.

## Prerequisites

- Knowledge of the database engine's backup tools (`pg_dump`, `pg_basebackup`, `mysqldump`, `mongodump`, or the managed service's backup feature).
- A written RPO (how much data loss is acceptable) and RTO (how long recovery may take), agreed with the people who own the service.
- A storage location for backups that is separate from the database server, with its own access controls.
- A test environment where restores can be rehearsed without touching production.

## Official Documentation

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — backup, `pg_dump`, continuous archiving, and PITR.
- [MySQL reference manual](https://dev.mysql.com/doc/) — backup and recovery, including `mysqldump`.
- [MongoDB documentation](https://www.mongodb.com/docs/) — backup methods and `mongodump`.
- [SQLite documentation](https://www.sqlite.org/docs.html) — the backup API and file-copy guidance.

## Required Workflow

1. Agree the RPO and RTO in writing: how much data may be lost, and how long the service may be down during recovery.
2. Choose the backup method that meets those objectives: logical dumps for small databases and portability, physical base backups plus WAL or binlog archiving for large databases and point-in-time recovery.
3. Automate backups on a schedule (daily at minimum for most applications; more often for a tight RPO) and automate retention and cleanup.
4. Store backups separately from the database server — a different host, ideally a different region or provider — and encrypt them.
5. Verify every backup: check that it completed, that its size is plausible, and that it is readable.
6. Rehearse a full restore on a schedule (at least monthly for important databases): restore to a test environment, verify the data, and time the restore against the RTO.
7. Rehearse a point-in-time restore to a moment just before a simulated bad change, and verify the recovered data is correct.
8. Document the restore procedure as a runbook: exact commands, credentials location, verification steps, and who decides to run it.
9. Before any destructive operation (a migration that drops data, a bulk delete), take a fresh backup and confirm it completed.
10. After any restore rehearsal or real recovery, record what happened, how long it took, and what to improve.

## Implementation Standards

- Backups run automatically on a schedule; a backup that depends on someone remembering to run it will eventually not run.
- Backup storage is separate from the database server and is encrypted at rest.
- Retention is defined and automated: how many daily, weekly, and monthly backups are kept, and when old ones are deleted.
- Every backup is verified after it is taken: completion status, size, and readability.
- Restores are rehearsed regularly against a test environment, timed against the RTO, and the results are recorded.
- The restore runbook is written down, kept current, and tested — not held in one person's head.
- Point-in-time recovery is configured where the RPO requires it (continuous WAL or binlog archiving); a daily dump alone cannot meet a tight RPO.
- Backup credentials are least-privilege and stored in a secret manager, not in the backup script.
- Backups include the data needed to restore the service, not just the database: note any files or configuration the application needs alongside it.
- A backup taken before a destructive change is verified before the change runs.

## Best Practices

- Test restores more often than feels necessary: the first time you discover a backup is corrupt should never be during a real incident.
- Keep at least one backup copy offsite or in a different region; a fire, flood, or provider outage can take the database and its local backups together.
- Automate restore testing where possible: a scheduled job that restores the latest backup and runs a smoke test catches problems early.
- Label backups clearly with the database, the time, and the method, so the right one is picked under pressure.
- Practice the decision, not just the commands: know in advance who declares a recovery, who runs it, and how users are told.
- Keep the backup tool and the database versions compatible; a dump from a newer version may not restore on an older server.
- For managed databases, understand what the provider backs up and what it does not — and verify that its restore meets the RPO and RTO.

## Security Considerations

- Backups contain the same sensitive data as the database: encrypt them at rest and in transit, and restrict access to the smallest set of people who need it.
- Backup credentials are least-privilege and stored in a secret manager.
- Old backups must be deleted on schedule; a forgotten backup is a forgotten copy of personal data and may breach retention or erasure obligations.
- Test restores should use sanitized data where the test environment is less protected than production.
- Log backup access and restore operations so an unauthorized restore is visible.
- Do not store backups in a public or world-readable location.

## Performance Considerations

- Logical dumps (`pg_dump`, `mysqldump`) read the whole database and can load the server; schedule them outside peak hours or run them against a replica.
- Physical base backups are faster for large databases and are the basis for point-in-time recovery.
- Continuous archiving (WAL or binlog) adds a small steady write cost; budget for the storage it needs.
- A restore is I/O-bound: the RTO depends on backup size, storage speed, and how much WAL or binlog must be replayed. Time it in rehearsal.
- Compressing backups saves storage and transfer time but costs CPU; measure the trade-off for the database size.
- Backups taken against a replica avoid loading the primary, where the deployment has one.

## Common Mistakes

- Never testing a restore — the most common and most expensive mistake; a backup that cannot be restored is worthless.
- Storing backups on the same server as the database — one failure loses both.
- Relying on a daily dump for a tight RPO — a daily dump can lose up to a day of data; use continuous archiving for point-in-time recovery.
- No retention policy — backups accumulate until storage fills, or old backups with personal data are kept indefinitely.
- Copying a live database file as a backup (especially SQLite) — the copy can be inconsistent; use the engine's backup method.
- Not timing restores — discovering during an incident that recovery takes four hours when the RTO is one.
- Keeping the restore procedure in one person's head — if that person is unavailable, the recovery stalls.

## Examples

```bash
# Example: logical backup of a PostgreSQL database (custom format).
pg_dump -Fc -f backup-2026-11-20.dump "$DATABASE_URL"
```

```bash
# Example: restore that backup into a fresh database.
pg_restore -d restored_db backup-2026-11-20.dump
```

```bash
# Example: logical backup of a MySQL database.
mysqldump --single-transaction --quick mydb > backup-2026-11-20.sql
```

```bash
# Example: verify a PostgreSQL dump lists its contents before trusting it.
pg_restore --list backup-2026-11-20.dump | head -20
```

## Validation Checklist

- [ ] RPO and RTO are written down and agreed.
- [ ] Backups run automatically on a schedule that meets the RPO.
- [ ] Backups are stored separately from the database server and are encrypted.
- [ ] Retention and cleanup are defined and automated.
- [ ] Every backup is verified after it is taken.
- [ ] A full restore was rehearsed in a test environment and timed against the RTO.
- [ ] A point-in-time restore was rehearsed, where the RPO requires it.
- [ ] The restore runbook is written down, current, and tested.

## Expected Deliverables

- The backup configuration (schedule, method, retention, storage location).
- The written RPO and RTO.
- The restore runbook with exact commands and verification steps.
- A record of the most recent restore rehearsal: date, duration, and result.

## References

- [PostgreSQL documentation](https://www.postgresql.org/docs/) — backup and PITR.
- [MySQL reference manual](https://dev.mysql.com/doc/) — backup and recovery.
- [MongoDB documentation](https://www.mongodb.com/docs/) — backup methods.
- [SQLite documentation](https://www.sqlite.org/docs.html) — backup API.
- Related skills in this repository: `database-security`, `migrations`, `postgresql`, `mysql`, `mongodb`, `sqlite`.
