# Migration boundaries

M0 and M1 preserve repository history and establish the new application foundation only. They do not migrate real SQLite data, attachments, logs, user files, or private backups.

Any later data migration must be specified separately and must include:

- source-schema validation and a read-only extraction;
- a local-only encrypted/offline backup and restore test;
- deterministic transformation and dry-run reporting;
- transactional import into a separate FORGE Org Tool data directory;
- rollback/recovery and integrity verification;
- explicit operator consent before touching any real data.

The original Forge data directory must never be overwritten by default. No migration code containing embedded real data belongs in the public repository.
