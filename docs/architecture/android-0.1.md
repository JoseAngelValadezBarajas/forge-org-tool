# FORGE Android 0.1 shell

**Status:** `BLOCKED` for native Android certification in the current Windows
environment. The source-level shell contract and Desktop/Web regressions are
implemented and verified, but this machine cannot currently compile, install,
or launch an Android APK.

## Scope

Android 0.1 is a cloud-only Tauri shell. It reuses the existing React frontend
and `@forge-org/api-client`, and uses the user's Supabase project through Auth
and the HTTPS Data API. SQLite, the Python sidecar, offline synchronization,
and Play Store packaging are deliberately excluded.

The runtime boundary is:

```text
Android Tauri shell
  -> React frontend
  -> @forge-org/api-client
  -> Supabase Auth / HTTPS Data API / Storage
```

The Desktop boundary remains unchanged:

```text
Desktop Tauri host
  -> authenticated desktop_request command
  -> per-user Python sidecar
  -> local SQLite
```

The Android build has no `externalBin`, no sidecar startup, no
`desktop_request` command, and no loopback endpoint in its CSP. If a local
`/api/v1/` request is attempted in Android, the frontend fails explicitly with
`Local SQLite transport is unavailable on Android; configure Supabase storage.`
The Storage settings also disable Local SQLite in that runtime.

## Architecture decision

Two options were considered:

1. Extend the existing Tauri host with platform-specific configuration and
   conditional Rust entry points.
2. Create a separate Android host and duplicate its Tauri bootstrap.

Option 1 is selected. `tauri.conf.json` remains the Desktop source of truth,
while `tauri.android.conf.json` removes the Desktop sidecar and adjusts the
development URL for the Android emulator. `main.rs` keeps the existing
sidecar/tray/IPC implementation behind a non-mobile target gate and uses a
minimal mobile builder. React routes, storage state, Supabase capabilities,
and business components remain shared. This minimizes Desktop risk and avoids
two application shells drifting apart.

The Android development URL is `http://10.0.2.2:5173`, the Android emulator's
gateway to the host machine. Vite binds to `0.0.0.0` only when
`FORGE_ANDROID_DEV=1`; normal Web/Desktop development remains bound to
`127.0.0.1`.

## Reproducible setup

Run these steps from the Android worktree after installing the Android
prerequisites:

```powershell
$env:Path = "C:\Users\<user>\.cargo\bin;$env:Path"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\<installed-version>"

rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
npm ci
npm run build

Set-Location apps\desktop\src-tauri
npx tauri android init --ci
```

For emulator development, start Vite in one terminal and the Android shell in
another:

```powershell
# terminal 1, repository root
$env:FORGE_ANDROID_DEV = '1'
npm run dev --workspace=@forge-org/web -- --host 0.0.0.0 --port 5173

# terminal 2, apps/desktop/src-tauri
$env:Path = "C:\Users\<user>\.cargo\bin;$env:Path"
npx tauri android dev
```

To create a debug APK and install it on an available emulator/device:

```powershell
# repository root
npm run build
Set-Location apps\desktop\src-tauri
npx tauri android build --debug --apk

adb devices
adb install -r .\gen\android\app\build\outputs\apk\universal\debug\app-universal-debug.apk
adb shell monkey -p com.forge.orgtool 1
adb logcat | Select-String 'FORGE|AndroidRuntime|WebView'
```

The exact APK filename can vary with the Android Gradle plugin; inspect
`gen/android/app/build/outputs/apk/` if the universal artifact is not present.
Do not put Supabase credentials in the repository. Use a disposable or
explicitly authorized test project and synthetic records for Android
acceptance.

For a physical device, replace the emulator gateway with the host's LAN
address and ensure the firewall permits the Vite port. This is not part of the
current certification because no device or emulator is available here.

## Current evidence and blocker

Verified in this worktree on 2026-10-26:

- Node 24.13.0, npm 11.6.2, Vite, and the existing frontend dependencies are
  available.
- Rust 1.99.1 and `rustfmt` are installed under
  `C:\Users\josea\.cargo\bin`; they are not on the default `PATH`.
- Visual Studio Build Tools 2022, WebView2, Python 3.12, and `uv` are available.
- Desktop `cargo check --locked` passes after generating the ignored local
  sidecar artifact, and both Desktop manifests pass `cargo fmt -- --check`.
- Rust cross-compilation with the installed `aarch64-linux-android` target
  passes `cargo check --target aarch64-linux-android --locked`; this verifies
  the mobile entry point and target-gated dependencies, not an installable
  Android application.
- `npm run build`, production Component Host exclusion, TypeScript, all Web
  Vitest tests (182 passed, 8 skipped), API-client contract tests, and Android
  shell contract tests pass.
- `npx tauri android init --ci --skip-targets-install` now reaches Tauri's
  Android prerequisite check but reports that `ANDROID_HOME` is not set. It
  creates only local generated schemas; no `gen/android` project or APK is
  available.
- `npx tauri android build --debug --apk` therefore fails before Gradle with
  `Android Studio project directory ...\\gen/android doesn't exist`.
- `java` resolves only to the installed Java 8 path shim. Android Studio/JDK,
  Android SDK/command-line tools, platform-tools/`adb`, NDK, Gradle, and an
  emulator/device are unavailable.

Consequently there is no honest Android installation, launch, navigation, or
runtime-error evidence in this pass. This status must remain `BLOCKED`, not
`PASS`, until an APK is built, installed, and opened on Android.

## Android 0.2 recommendation

Keep the shared-host approach. Add a checked-in Android build lane only after
the first APK can be built locally, then add a real emulator smoke test that
proves: the shell opens, no local sidecar is started, Supabase sign-in is
explicit, workspace navigation renders, a cloud read succeeds, and a
non-configured provider cannot fall back to SQLite. Offline sync, native
SQLite, and distribution signing should remain separate initiatives.
