# Releasing Forge Preview builds

This document describes the owner-controlled release procedure for `v0.1.3-preview.1`. The workflow builds artifacts but does not create or publish a GitHub Release. Keep the `release` GitHub Environment protected with required human reviewers.

## 1. Android keystore

Create the persistent upload key once with a JDK owned by the release owner. Do not run this in GitHub Actions and do not commit the file:

```powershell
keytool -genkeypair -v `
  -keystore "$env:USERPROFILE\forge-upload-keystore.jks" `
  -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 `
  -alias forge-upload
```

Back up the keystore and its passwords in the owner's password manager and a separate protected backup. Record the SHA-256 fingerprint of the keystore backup. The same keystore and alias must be retained for future Android updates.

Configure these secrets in the protected GitHub Environment named `release`:

- `ANDROID_KEYSTORE_BASE64`: base64 of the persistent `.jks` file.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: normally `forge-upload`.
- `ANDROID_KEY_PASSWORD`: key password.

Example export from a trusted owner machine; review the output destination before copying it to GitHub:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\forge-upload-keystore.jks")) |
  Set-Clipboard
```

The workflow decodes the key only under the runner temporary directory, validates the alias with `keytool`, creates generated `keystore.properties`, builds the release APK, verifies it with `apksigner`, and removes the runner workspace after the job. Passwords and the keystore are never uploaded as artifacts.

## 2. Windows Authenticode signing

Obtain a code-signing certificate from a trusted provider. Do not create a self-signed certificate and present it as publicly trusted.

### Which kind of certificate this pipeline can use today

The workflow signs with a PFX file kept in protected secrets. That only works with a certificate whose private key can be exported. Since June 2023 the CA/Browser Forum requires the private key of a publicly trusted code-signing certificate (OV and EV) to live on FIPS 140-2 Level 2 or Common Criteria EAL4+ hardware, a token or a cloud HSM, and the key cannot be exported. In practice a **new** certificate from a public CA cannot be turned into a PFX for a GitHub secret. Check with the provider before buying: the PFX path below is for a certificate that already exists as an exportable file.

For a new certificate there are two realistic routes, and each needs a small change to the Windows job that has not been made yet (it must be built against the real provider, so it cannot be tested before the account exists):

- **Cloud signing service** (Microsoft's Artifact Signing, formerly Trusted Signing, or a CA's cloud HSM such as SSL.com eSigner or DigiCert KeyLocker). Tauri supports a custom `bundle.windows.signCommand`, so the job would call the provider's signing tool instead of importing a PFX. Artifact Signing is limited by identity and geography: reporting from March 2026 says individuals are accepted only in the USA and Canada and that onboarding was narrowed during the preview, so an organization identity in a supported country may be required. Confirm current eligibility and prices on Microsoft's pages before relying on this.
- **Hardware token** held by the owner. It cannot be used from a hosted GitHub runner, so the installer would be signed on the owner's machine with `signtool` after the workflow produces the unsigned build.

What signing does not do: it identifies the publisher and avoids the "unknown publisher" prompt, but SmartScreen reputation still builds with downloads. Sources disagree on whether an EV certificate still earns instant reputation after Microsoft's March 2024 change, so do not promise users that the warning disappears immediately.

### Configure the PFX path (exportable certificates only)

Configure these secrets in the protected `release` Environment:

- `WINDOWS_PFX_BASE64`: base64 of the PFX file.
- `WINDOWS_PFX_PASSWORD`: PFX export password.

When both secrets are available, the workflow imports the PFX into the ephemeral Windows certificate store, lets Tauri sign the NSIS output, and verifies the resulting installer with `signtool verify /pa`. The PFX is never uploaded.

If either secret is absent, the workflow still produces the NSIS installer and writes `WINDOWS_SIGNING_PENDING` to its status record. It must not generate or install a fake certificate. If signing is configured but import/signature verification fails, the job fails rather than silently reporting a signed release.

## 3. Build the Preview artifacts

After the PR has received human review and has been merged to `main`, run the workflow manually or push the exact tag:

```powershell
git fetch origin main
git checkout main
git pull --ff-only origin main
git tag -a v0.1.3-preview.1 -m "FORGE Org Tool 0.1.3 Preview 1"
git push origin v0.1.3-preview.1
```

The distribution workflow is intentionally not triggered by pull requests. It runs on the exact Preview tag or through `workflow_dispatch` from `main` with `release_tag=v0.1.3-preview.1`, and it uses the protected `release` Environment before accessing signing secrets.

The workflow produces:

- Android signed release APK and `SHA256SUMS.txt`.
- Windows NSIS installer, signing status and `SHA256SUMS.txt`.

Verify each checksum before attaching an artifact to a release. On Windows, also inspect the signer and timestamp in Explorer or with `signtool verify /pa /v`. On Android, use `apksigner verify --verbose --print-certs`.

## 4. Create the GitHub Pre-release manually

Only after a human has reviewed the workflow run, artifacts, checksums, signatures and known limitations:

1. Open GitHub Releases for `JoseAngelValadezBarajas/forge-org-tool`.
2. Choose `Draft a new release` and select `v0.1.3-preview.1`.
3. Paste [`docs/releases/v0.1.3-preview.1.md`](../releases/v0.1.3-preview.1.md) as the notes.
4. Attach the verified Windows and Android artifacts plus their checksum/status files.
5. Mark the release as **Pre-release**.
6. Publish only after the owner confirms the signing states and artifact hashes.

The release workflow does not perform these steps automatically and has no `contents: write` permission.

## 5. Update and rollback guidance

Install the next Preview over the existing installation only after verifying its checksum and signature. Windows NSIS upgrades preserve the application's per-user data path; Android installation may replace the APK while cloud data remains in the owner's Supabase project. Export or back up user data before changing providers or uninstalling Windows.

If a Preview is defective, stop distribution, mark the GitHub Release accordingly, and publish a corrected Preview tag. Do not delete user databases or remote Supabase records as part of rollback.
