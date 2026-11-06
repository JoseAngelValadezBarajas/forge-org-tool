/**
 * Transfer and attachment limits. These must equal the Python API constants and the
 * Supabase migrations; `contracts/transfer/conformance.json` is the shared reference.
 */
export const TRANSFER_LIMITS = {
  max_attachment_bytes: 5 * 1024 * 1024,
  max_attachments_per_bug: 5,
  max_package_bytes: 5 * 1024 * 1024,
  max_package_entries: 100,
  max_expanded_bytes: 25 * 1024 * 1024,
  max_document_bytes: 7 * 1024 * 1024,
  max_epics: 100,
  max_features: 500,
  max_dependencies: 5000,
  max_tasks: 2000,
  max_criteria: 2000,
} as const;
