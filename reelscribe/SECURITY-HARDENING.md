# ReelScribe Security Hardening Checklist

Most application-level controls are committed to the repository. The remaining account and repository controls must be enabled in GitHub settings because they cannot be enforced by website code.

## 1. Protect the owner account

- Enable two-factor authentication.
- Add at least one passkey or hardware security key.
- Review active sessions and revoke unknown devices.
- Remove unused personal access tokens and GitHub Apps.
- Keep recovery codes offline.

## 2. Protect `main` with a branch ruleset

In **Settings → Rules → Rulesets**, create an active branch ruleset targeting the default branch `main`.

Recommended rules:

- Require a pull request before merging.
- Require at least one approval.
- Require review from CODEOWNERS.
- Dismiss stale approvals when new commits are pushed.
- Require all conversations to be resolved.
- Require status check: `ReelScribe quality check / validate`.
- Require branches to be up to date before merging.
- Require signed commits.
- Require linear history.
- Block force pushes.
- Block branch deletion.
- Do not grant routine bypass access.

## 3. Restrict GitHub Actions

In **Settings → Actions → General**:

- Set the default `GITHUB_TOKEN` permission to **Read repository contents**.
- Disable approval of pull requests by GitHub Actions.
- Prefer GitHub-authored actions and verified creators.
- Require actions to be pinned to a full commit SHA when the setting is available.
- Do not add repository secrets to this static site unless a future feature absolutely requires them.

The ReelScribe workflow already uses read-only permissions, disables persisted checkout credentials, and pins external actions to full SHAs.

## 4. Enable security services

In **Settings → Security / Advanced Security** enable every option available for the public repository:

- Dependency graph
- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Private vulnerability reporting
- Code scanning default setup for JavaScript, if available

## 5. Protect production

- Keep GitHub Pages HTTPS enforcement enabled.
- Deploy only from the protected `main` branch.
- Do not place passwords, API keys, session cookies, or private tokens in the repository.
- Review every change to `.github/workflows/`, `reelscribe/`, `tests/`, and `robots.txt`.
- Investigate immediately if production integrity checks report that deployed files differ from repository files.

## 6. Recovery plan

If unauthorized content is detected:

1. Disable Pages or make the repository private temporarily if necessary.
2. Revoke suspicious sessions, tokens, and app authorizations.
3. Revert `main` to the last verified signed commit.
4. Re-run the ReelScribe quality workflow.
5. Verify production files match the repository.
6. Restore public access only after the incident is understood.
