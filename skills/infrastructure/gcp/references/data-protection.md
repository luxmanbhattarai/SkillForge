# Data protection: encryption, private buckets, backups

- Data at rest is encrypted with Google-managed keys by default; use
  customer-managed keys (CMEK) via Cloud KMS where the workload's
  compliance needs them.
- Cloud Storage buckets are private by default (uniform bucket-level
  access enabled); public access requires an explicit, reviewed
  exception.
- Databases use automated backups with a defined retention period, and
  production databases are highly available (regional Cloud SQL,
  multi-region Spanner or Firestore where needed).
