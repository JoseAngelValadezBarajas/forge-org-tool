# ORG-008 Sidecar Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure the desktop launcher never reports a usable sidecar session after its owned process has already exited.

**Architecture:** Keep process ownership in `apps/desktop/sidecar_launcher.py`; add a narrow post-spawn liveness guard and preserve the existing per-launch token, loopback port, LocalAppData paths, and stop semantics. This is pre-packaging policy hardening only and does not enable Tauri bundling, PyInstaller, installer work, or installed-product smoke.

**Tech Stack:** Python 3.12, `subprocess`, `unittest.mock`, existing desktop policy tests.

**Spec:** `docs/specs/ORG-008-desktop/spec.md` and `docs/specs/ORG-008-desktop/acceptance.md`

## Global Constraints

- Rust owns the session capability, process lifecycle, route manifest, and filesystem/process policy.
- React receives no token and no arbitrary HTTP or shell capability.
- Do not enable `bundle.active`, add PyInstaller, create an installer, or claim installed Windows smoke.
- Preserve per-launch bearer tokens, loopback-only binding, LocalAppData isolation, backup behavior, and process cleanup.

## Review Focus

- Child exits before the session is returned: launch fails explicitly instead of exposing a dead session.
- Child remains alive: existing command, environment, token, port, and cleanup behavior remain unchanged.
- Existing database: backup policy remains invoked before launch.
- Missing `LOCALAPPDATA`: existing explicit failure remains unchanged.
- Packaging boundary: tests must not be described as installed-product certification.

### Task 1: Failing launcher lifecycle test

**Files:**
- Modify: `apps/desktop/tests/test_sidecar_launcher.py`

- [x] Add a test with a mocked child process whose `poll()` returns a non-zero exit code and assert `start_sidecar()` raises a clear startup error.
- [x] Run the desktop launcher test and confirm the new test failed because the current launcher returned a dead session.

### Task 2: Minimal lifecycle guard

**Files:**
- Modify: `apps/desktop/sidecar_launcher.py`

- [x] After spawning, inspect the owned process once; raise `RuntimeError` when it has already exited, preserving the existing session for a live process.
- [x] Run the focused and full desktop launcher tests (4/4 passed).

### Task 3: Verification records

**Files:**
- Modify: `docs/evidence/reconstruction/verification.md`
- Modify: `docs/specs/ORG-008-desktop/acceptance.md` only if evidence wording needs clarification.

- [x] Record lifecycle policy verification separately from the still-outstanding packaging/installed-product acceptance items.
- [x] Run local policy checks and GitHub Quality CI (`39392594672`); do not mark ORG-008 fully verified.
