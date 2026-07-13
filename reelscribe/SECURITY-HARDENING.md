# ReelScribe Security Hardening Checklist

Most application-level controls are committed to the repository. Remaining account and repository controls must be enabled in GitHub settings because website code cannot enforce them.

## 1. Protect the owner account

- Enable two-factor authentication.
- Add at least one passkey or hardware security key.
- Review active sessions and revoke unknown devices.
- Remove unused personal access tokens and GitHub Apps.
- Keep recovery codes offline.

## 2. Protect `main` with a branch ruleset

In **Settings → Rules → Rulesets**, create an active ruleset targeting `main`:

- Require a pull request before merging.
- Require at least one approval and CODEOWNERS review.
- Dismiss stale approvals after new commits.
- Require all conversations resolved.
- Require status check `ReelScribe quality check / validate`.
- Require branches up to date, signed commits and linear history.
- Block force pushes and branch deletion.
- Do not grant routine bypass access.

## 3. Restrict GitHub Actions

In **Settings → Actions → General**:

- Set default `GITHUB_TOKEN` permission to read repository contents.
- Disable approval of pull requests by GitHub Actions.
- Prefer GitHub-authored actions and verified creators.
- Require actions pinned to full commit SHAs when available.
- Do not add repository secrets to this static site unless essential.

The ReelScribe workflow uses read-only permissions, disables persisted checkout credentials and pins external Actions to full SHAs.

## 4. Browser model, OCR and cache boundaries

- Whisper, Silero VAD and Tesseract OCR execute in the browser.
- OCR reads frames from the local `<video>` element through Canvas only.
- `screen-ocr.js` must not create `FormData`, upload screenshots, call remote OCR endpoints or include account credentials.
- Tesseract.js, ONNX Runtime Web, vad-web and Transformers.js versions remain explicitly pinned and scheduled health checks verify their public assets.
- Content Security Policy restricts scripts to the application origin and the reviewed jsDelivr dependency origin.
- External requests use `no-referrer`; social resolver requests use `credentials: omit`.
- Storage estimates and persistence requests do not reveal file contents; they are used only to choose conservative caching behavior.
- Under storage pressure, background model preparation stops, Whisper falls back to Tiny and OCR disables cache writes.
- The AI-cache removal control targets only cache/database names associated with models or OCR. It must not delete unrelated origin storage or transcript text.
- Model download, OCR and transcription must not trigger intentional page reloads.

## 5. Safe Service Worker lifecycle

- Do not use `skipWaiting()` or `clients.claim()` for ReelScribe updates while old clients may still be active.
- Do not reload on `controllerchange` or invoke `window.location.reload()` to activate a build.
- A waiting update applies after existing tabs close or on the next natural visit.
- Service Worker cache cleanup is prefix-scoped to `reelscribe-shell-*`.
- HTML, JavaScript, CSS, Worker and Manifest remain network-first to reduce stale-code exposure.
- Production integrity checks compare critical deployed files, including runtime optimizer and OCR modules, with repository contents.

## 6. Enable security services

In **Settings → Security / Advanced Security**, enable every available option:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Private vulnerability reporting
- Code scanning default setup for JavaScript, when available

## 7. Protect production

- Keep GitHub Pages HTTPS enforcement enabled.
- Deploy only from protected `main`.
- Do not place passwords, API keys, session cookies or private tokens in the repository.
- Review every change to `.github/workflows/`, `reelscribe/`, `tests/` and `robots.txt`.
- Investigate immediately if deployed files differ from repository files.
- Review newly proposed CDN scripts for license, integrity, maintenance state, CSP impact, data flow and fallback behavior before installation.

## 8. Recovery plan

If unauthorized or unsafe content is detected:

1. Disable Pages or make the repository private temporarily when necessary.
2. Revoke suspicious sessions, tokens and app authorizations.
3. Revert `main` to the last verified signed commit.
4. Re-run the ReelScribe quality workflow.
5. Verify production files match the repository.
6. Clear only the affected ReelScribe App Shell or model cache when client corruption is involved.
7. Restore public access only after the incident is understood.