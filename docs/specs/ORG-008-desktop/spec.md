# ORG-008 Windows desktop boundary

The desktop target is a Tauri/Rust host around the bundled web application and
an authenticated, per-launch loopback FastAPI sidecar. Rust owns the session
capability, process lifecycle, route manifest, and filesystem/process policy;
React receives no token and no arbitrary HTTP or shell capability.

The repository contains a dependency-free Rust route/loopback policy scaffold,
an authenticated FastAPI sidecar composition root, and a desktop-owned Python
launch policy for per-user LocalAppData paths and process cleanup. Tauri
packaging, PyInstaller bundling, single-instance locking, installer, and
installed Windows smoke remain required before this capability can be verified.
