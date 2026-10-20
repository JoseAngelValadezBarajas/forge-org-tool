# ORG-007 Project transfer

Project transfer uses the versioned `forge-project-import-v1` JSON contract.
Preview validates references and computes a canonical fingerprint without
writing. Commit requires the exact reviewed fingerprint and writes planning
records only; runs, decisions, evidence, context packages, and release records
are intentionally excluded. Export returns the stable planning document.
