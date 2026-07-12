# Security Policy

## Supported version

The production version at `https://paq6809.github.io/reelscribe/` and the current `main` branch are supported.

## Reporting a vulnerability

Please do not disclose an exploitable issue publicly before a fix is available.

Preferred reporting path:

1. Open the repository's **Security** tab.
2. Use **Report a vulnerability** / private vulnerability reporting when available.
3. Include the affected URL or file, reproduction steps, browser and device, impact, and any proof-of-concept that does not expose user data.

Do not include passwords, cookies, access tokens, private video links, private subtitles, or other personal data in a report.

## Security boundaries

ReelScribe intentionally does not:

- request social-media passwords, cookies, private tokens, or session data;
- bypass login, paywalls, DRM, or private-account permissions;
- upload local media to a ReelScribe backend;
- use third-party analytics or advertising trackers;
- execute user-supplied HTML or JavaScript.

## Repository hardening requirements

- Changes to `reelscribe/`, `.github/workflows/`, and `tests/` require owner review through CODEOWNERS when branch rules are enabled.
- GitHub Actions receive read-only repository permissions unless a specific job requires more.
- Third-party actions must be pinned to a full commit SHA.
- Force pushes and branch deletion on `main` should be blocked.
- Required status check: `ReelScribe quality check / validate`.
- Require pull requests, signed commits, and conversation resolution before merging where GitHub plan and repository settings allow.
- Enable Dependabot alerts, Dependabot security updates, secret scanning, push protection, and private vulnerability reporting in repository settings.

## Incident response

If unauthorized content appears on the production site:

1. Disable GitHub Pages temporarily if needed.
2. Revoke suspicious sessions and tokens and rotate any exposed credentials.
3. Inspect repository audit/activity logs and recent commits.
4. Revert to the last verified commit.
5. Re-run the ReelScribe quality workflow and production checksum checks.
6. Restore Pages only after the deployed files match the repository state.
