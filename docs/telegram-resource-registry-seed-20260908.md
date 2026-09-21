# Telegram Resource Registry Seed — 2026-09-08

Status: draft evidence seed for PR #45
Purpose: record verified legal discoveries from the latest Telegram monitoring window without downloading, installing, executing, registering, or granting credentials to any Telegram-recommended software.

## markpage

- name: MarkPage
- telegram_label: Tab Harbor (mislabelled in channel post; canonical GitHub project is MarkPage)
- resource_type: Chrome extension / bookmark manager / optional AI classifier
- telegram_last_seen: 2026-09-08
- canonical_source: https://github.com/Yeung9203/MarkPage
- publisher_or_owner: Yeung9203
- license: MIT
- platforms: Chrome / Chromium browsers; Manifest V3
- maintenance_state: small/new project; 17 commits visible at verification time
- purpose: bookmark search, tags, AI-assisted classification, frequent links, new-tab workspace
- privacy_notes: project privacy policy states bookmark/tag/config data remains on-device; bookmark title+URL is sent only to the user-configured AI endpoint when AI is enabled; active-tab title/URL is used in-memory for popup workflows; Google Fonts is also fetched as a static resource
- network_behavior: no project-operated backend; optional direct calls from browser to user-configured OpenAI-compatible endpoint; Google Fonts request
- credential_requirements: optional AI API key stored in chrome.storage.local
- permissions: bookmarks / storage / tabs
- safety_flags: API key is stored in browser extension storage; bookmark titles and URLs may reveal private repositories, internal documents, school systems or research interests when AI mode is enabled; AI is enabled by default in v1.0.0 according to README changelog
- legal_flags: normal MIT software use; bookmark content and linked resources remain governed by their own rights and policies
- project_matches:
  - Telegram resource registry: high architectural fit for tag/classification + local canonical state
  - research/learning workspace: medium fit for organizing reading/research links
  - AI/Coding Agent: medium fit for explicit AI-off switch and third-party endpoint disclosure pattern
- integration_status: registry-only; not installed
- acceptance_criteria: any PAQ prototype must default AI off, use synthetic/test bookmarks first, prohibit private-repo/school/admin URLs from external AI classification, never reuse a production API key, provide one-click export/delete, and document extension permissions before installation
- rollback_plan: remove isolated prototype/registry record; no browser extension or runtime dependency currently installed
- last_verified_at: 2026-09-08

## dbx

- name: DBX
- resource_type: database client / CLI / MCP server / Docker web app
- telegram_last_seen: 2026-09-08
- canonical_source: https://github.com/t8y2/dbx
- publisher_or_owner: t8y2
- license: Apache-2.0
- platforms: Windows / macOS / Linux / Docker / CLI
- maintenance_state: highly active large repository; 6,000+ commits and active issues/PRs visible at verification time
- purpose: lightweight multi-database management, SQL editing, AI assistance, CLI and MCP access across 90+ database types
- privacy_notes: handles highly sensitive database credentials, SSH/proxy settings, AI provider keys and connection metadata; risk depends on configured databases and optional AI/MCP usage
- network_behavior: connects to user-configured databases, SSH/proxies, optional AI endpoints, Docker/Web backend; MCP server can expose configured DBX connections to AI agents
- credential_requirements: database credentials; optional SSH keys/passwords, AI provider keys, DBX Web password depending on use
- security_notes: repository has SECURITY.md; UI documents confirmation dialogs for destructive operations and encrypted config export/import; MCP policy offers connection allowlist plus read_only / safe_write / high_risk_write access modes
- safety_flags: MCP/CLI access can become a direct database mutation channel; npx -y package execution creates supply-chain exposure; full-access mode and production database credentials are high-risk; project sponsors include third-party AI relay services which are not part of DBX trustworthiness and are not approved infrastructure
- legal_flags: Apache-2.0; database access must only target systems the user owns or is explicitly authorized to administer
- project_matches:
  - AI/Coding Agent anti-drift: very high architectural fit for capability-level read/write/high-risk permission classes and connection allowlists
  - Lumen: medium architecture fit only; production financial data stores must remain read-only by default and source-first/provenance rules remain authoritative
  - iRent / future backend projects: medium fit for local/dev database inspection; no production credential exposure
  - research/learning platform: medium fit for local SQLite/DuckDB exploration
- integration_status: permission-model pattern adopted into registry guidance only; DBX/MCP not installed or connected
- acceptance_criteria: any future test must use disposable local SQLite/DuckDB data, MCP read_only mode only, explicit connection allowlist, no production credentials, no DB schema/Auth/RLS changes, pinned reviewed MCP package/binary rather than blind npx -y execution, destructive-query confirmation tests, and audit logs for every agent query
- rollback_plan: remove isolated MCP/client config and disposable test database; no production dependency introduced
- last_verified_at: 2026-09-08

## qianwen-ime

- name: 千問輸入法
- resource_type: proprietary system input method / voice-to-text service
- telegram_last_seen: 2026-09-08
- canonical_source: https://ime.qianwen.com/
- publisher_or_owner: 上海智信普惠科技有限公司
- license: proprietary / not open source
- platforms: iOS / Android / macOS; official site states Windows version is forthcoming at verification time
- maintenance_state: active official product; privacy policy published 2026-06-26
- purpose: keyboard input, voice dictation, AI rewrite/polish, dialect recognition, personal dictionary
- privacy_notes: official privacy policy says keyboard core processing is local by default, but voice input is encrypted and sent to server for ASR+LLM processing; service also collects device/log/security data, may use third-party SDKs, and may inspect clipboard locally at first launch for attribution tokens
- network_behavior: voice input requires server processing; device/log data and some attribution data can be transmitted; PC/Mac may use cookies or similar identifiers
- credential_requirements: normal product/account requirements depend on platform; no project credential integration evaluated
- safety_flags: system-level input method can observe highly sensitive text by design; voice can contain private project, account, school, financial or research information; third-party SDK and server-side processing enlarge the privacy boundary
- legal_flags: proprietary consumer service subject to its user agreement/privacy policy and applicable jurisdiction
- project_matches:
  - personal study/coding workflow: medium convenience fit for dictation and long-form notes
  - research/BCI/photoacoustic notes: low-medium fit only for non-sensitive drafts
  - AI/Coding Agent: low fit; should not be a secrets-entry path
- integration_status: reference-only; not installed, registered or granted microphone/input-method permissions
- acceptance_criteria: if ever evaluated, use non-sensitive test text/voice only, prohibit API keys/passwords/private-source snippets in voice dictation, confirm microphone and input-method permissions can be revoked, verify local-data deletion controls, and do not make it the default input method for privileged/admin workflows
- rollback_plan: revoke permissions/uninstall on test device; no project dependency
- last_verified_at: 2026-09-08

## douyin-downloader-jiji262

- name: douyin-downloader
- resource_type: Python downloader / Docker tool / browser-cookie automation
- telegram_last_seen: 2026-09-08
- canonical_source: https://github.com/jiji262/douyin-downloader
- publisher_or_owner: jiji262
- license: MIT
- platforms: Windows / macOS / Linux / Docker
- maintenance_state: established repository with roughly 9.6k stars at verification time; public releases exist
- purpose: Douyin single-item/profile batch download, image-note/music/collection handling, SQLite deduplication and integrity checking
- privacy_notes: recommended flow can launch Playwright, have the user log into Douyin, and automatically write captured cookies into local config; those cookies are sensitive session credentials
- network_behavior: accesses Douyin and downloads media; optional browser fallback/cookie capture; Docker mode supported
- credential_requirements: Douyin session cookies for authenticated workflows
- safety_flags: cookie capture, bulk downloading, platform anti-abuse/ToS exposure, content-rights risk; current public release instructions also tell users to bypass macOS Gatekeeper or Windows SmartScreen for unsigned binaries, which conflicts with PAQ safety policy
- legal_flags: MIT applies to code only; downloaded media remains subject to copyright, platform terms and creator permissions; bulk/automated acquisition must not be used to bypass access controls or licensing
- project_matches:
  - Telegram resource pipeline: low architecture fit for SQLite deduplication/integrity-check pattern only
  - research/media analysis: possible only with user-owned, licensed or explicitly permitted media
  - Atlas/media reader: downloader itself is not approved as an ingestion source
- integration_status: rejected for installation/automation under current policy; only deduplication and post-download integrity-check concepts retained
- acceptance_criteria: no binary install while official instructions require bypassing SmartScreen/Gatekeeper; no private-session cookie capture; no bulk acquisition of unlicensed media; any future code-level study must use public test URLs/content with clear permission and no DRM/access-control bypass
- rollback_plan: not applicable because no installation or integration was performed
- last_verified_at: 2026-09-08
