# Release Incident Response

## Severity 1

Examples:

- Model or dependency supply-chain compromise.
- Private media, frames or transcripts transmitted unexpectedly.
- Signing key or store API credential exposure.
- Remote code execution or arbitrary model loading.

Actions:

1. Stop rollout or remove the affected release from sale.
2. Revoke exposed credentials and sessions.
3. Disable the affected backend/model endpoint.
4. Preserve minimal forensic evidence without copying user media.
5. Publish a truthful status notice.
6. Prepare a clean signed rebuild and notify stores/users as required.

## Severity 2

Examples:

- Repeated crashes or ANRs on a supported device class.
- Corrupt model downloads passing an incomplete check.
- Long-job checkpoint loss.
- Public resolver returning incorrect/private content.

Actions:

1. Pause phased rollout.
2. Disable the affected model or source remotely only through a signed/static configuration mechanism.
3. Reproduce on the release build.
4. Ship the smallest verified fix.
5. Add a permanent regression test and update maintenance automation.

## Severity 3

Examples:

- Layout clipping.
- Incorrect store copy.
- Non-critical export formatting issue.

Actions:

- Record the issue, reproduce it and include a tested correction in the next release.

## Rollback readiness

- Keep the previous approved store build available.
- Keep model catalog revisions versioned.
- Never delete signing material during incident response.
- Do not bypass SHA verification to restore service.
- Do not enable an unreviewed third-party transcription proxy as an emergency workaround.

## Contact

Security contact draft: pinranchen6809@gmail.com

Do not request affected users to email private videos. Ask for app version, device, OS version, model, timestamps, redacted logs and a reproducible public/non-sensitive sample when possible.
