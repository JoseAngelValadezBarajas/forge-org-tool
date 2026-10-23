# FORGE Org Tool 1.1 UX evidence

The `screenshots/` directory contains 19 browser captures from the running React app: nine desktop target states at 1440x960 and ten mobile states at 390x844. The isolated Playwright SQLite fixture seeds synthetic workspaces, projects, Epics, Stories, Bugs, tags, tasks, criteria, and screenshot attachments. No installed or operator application data was read or modified. `desktop-installed-smoke.bmp` is a separate native screenshot from the newly built NSIS application running under an isolated temporary `LOCALAPPDATA`.

Capture command from the repository root (PowerShell):

```powershell
$env:FORGE_UX11_CAPTURE_DIR = (Join-Path (Get-Location) 'docs/evidence/ux-1.1/screenshots')
node tooling/scripts/run-playwright-isolated.mjs --config apps/web/playwright.ux-evidence.config.ts
Remove-Item Env:FORGE_UX11_CAPTURE_DIR
```

These are automated implementation screenshots for comparison against Figma nodes 344:3, 344:82, 344:182, 347:54, 347:145, 347:224, 347:308, 348:57, 348:129, and 348:210. They are not human visual certification.

| Figma target | Captured implementation | Remaining differences / review notes |
| --- | --- | --- |
| 344:3 Workspace Home | `01-workspace-home-1440x960.png`, `01-mobile-workspace-home.png` | Uses live project data and actions; spacing and card geometry still need design review. |
| 344:82 Project Board | `02-project-board-dark-1440x960.png` | Five columns fit at the target desktop viewport; card content includes product controls and longer copy than the reference. |
| 344:182 Epic Board | `03-epic-board-1440x960.png`, `03-mobile-epic-board.png` | Desktop shows five work-item lanes. Mobile uses status tabs and a collapsed filter disclosure; exact spacing and copy differ. |
| 347:54 Story Detail | `04-story-detail-1440x960.png`, `04-mobile-story-detail.png` | The real Story title is the page heading and Description is a distinct section; criteria and task management are product-backed. Remaining below-the-fold content density differs from the read-first reference. |
| 347:145 Bug Detail | `05-bug-detail-1440x960.png`, `05-mobile-bug-detail.png` | Structured reproduction data and persisted screenshot attachments work; screenshot placement and exact content hierarchy remain different. |
| 347:224 Create Epic | `06-create-epic-dialog-1440x960.png`, `06-mobile-create-epic.png` | Implemented as a right-side modal drawer on desktop and a bottom sheet on mobile; the Figma frame is a contextual panel integrated beside the board. |
| 347:308 Contextual Transfer | `07-contextual-transfer-preview-1440x960.png`, `07-mobile-contextual-transfer.png` | Import validation and preview work, but the current workflow steps and file/JSON controls differ from the compact split-panel reference. |
| 348:57 Workspace Tags/Settings | `08-workspace-tags-settings-1440x960.png`, `08-mobile-workspace-settings.png` | The captures wait for the synthetic `research` and `tracking` tags to load. Tag management is prioritized before workspace profile settings. The API does not provide tag usage counts, so none are fabricated. |
| 348:129 Light Project Board | `09-project-board-light-1440x960.png`, `09-mobile-project-board-light.png` | Uses semantic light-theme tokens; external review is still needed for exact color, spacing, and typography parity. |
| 348:210 Mobile Epic Board | `10-mobile-epic-board-390x844.png` | Work-item status selection and card interaction are functional at 390x844; exact Figma spacing and content density need human review. |

The screenshots use synthetic names and counts rather than the illustrative Figma data. No claim of pixel-perfect parity or external human certification is made by this evidence.

## Installed Windows acceptance

`npm run test:desktop:acceptance` rebuilt the web app and sidecar, produced the NSIS installer, installed it using a uniquely owned temporary app-data root, and verified the visible native window with Windows UI Automation. The test created a workspace, project, Epic, and Bug through the installed UI; confirmed API/SQLite persistence including a Bug screenshot attachment after application restart; and closed the app and sidecars. Latest run: window title `FORGE Org Tool`, 1216x839; database was confined to a unique `%LOCALAPPDATA%\Temp\forge-desktop-smoke-*` directory and removed with the owned test fixture. The retained screenshot shows the actual installed WebView. It does not certify human Figma parity.
