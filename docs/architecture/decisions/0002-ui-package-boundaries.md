# ADR-0002: Reusable component paradigm in the client

**Decision: accepted for M1, 2026-10-20.** Token foundations, generic primitives, and generic composed UI live in separate workspace packages and are imported by public package names. Business patterns live with their respective feature. Enforce allowed imports in a source scanner with tests and later ESLint/test coverage. No shared UI package references route, API transport, feature or domain state. No second copy of generic controls in app/features. Figma pages 19 and 20 serve as visual contract for these two ownership levels.
