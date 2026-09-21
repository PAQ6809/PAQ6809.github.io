# Telegram Resource Registry Seed — 2026-09-07

Status: draft evidence seed for PR #45
Purpose: convert today’s verified legal Telegram discoveries into durable registry records without installing or executing any Telegram-recommended software.

## openbiliclaw

- name: OpenBiliClaw
- resource_type: repository / local-first AI content discovery agent
- telegram_last_seen: 2026-09-07
- canonical_source: https://github.com/whiteguo233/OpenBiliClaw
- publisher_or_owner: whiteguo233
- license: MIT
- platforms: Windows / macOS / browser extension / mobile client / local web UI
- maintenance_state: active; upstream pushed 2026-09-06
- purpose: cross-platform personalized content discovery and recommendation
- privacy_notes: core profile, recommendation, dialogue, config and caches are documented as local by default, but external platform access and optional LLM calls still cross the local boundary
- network_behavior: connects to Bilibili, Xiaohongshu, Douyin, YouTube, X, Zhihu, Reddit, GitHub and other sources; optional PAT/API credentials; LAN/tailnet exposure is optional
- credential_requirements: optional platform sessions, GitHub PAT, LLM key, tailnet credential depending on enabled features
- safety_flags: browser-session reuse, psychological profiling, broad cross-platform ingestion, optional remote/LAN exposure
- legal_flags: source-platform Terms of Service and content-access rules remain applicable
- project_matches:
  - Telegram resource pipeline: high architectural fit for multi-source discovery + feedback loops
  - research/learning: medium fit for local recommendation queues
  - AI/Coding Agent: medium fit for local profile-driven retrieval, but profiling must not become an authority signal
- integration_status: architectural-only; not installed
- acceptance_criteria: any future prototype must use test accounts/data, no private browser session reuse by default, explicit source allowlist, no profiling-based irreversible decisions, local storage export/delete path, and a kill switch for every network connector
- rollback_plan: remove the isolated prototype/branch; no production dependency introduced
- last_verified_at: 2026-09-07

## boss-agent-cli

- name: boss-agent-cli
- resource_type: repository / CLI / MCP
- telegram_last_seen: 2026-09-07
- canonical_source: https://github.com/can4hou6joeng4/boss-agent-cli
- publisher_or_owner: can4hou6joeng4
- license: MIT
- platforms: Python 3.10+ CLI; MCP-capable
- maintenance_state: active; upstream pushed 2026-09-06; PyPI release 1.19.1 published 2026-08-27
- purpose: local-assisted job search, filtering, shortlist and structured Agent output
- privacy_notes: local cache is useful, but login/session/CDP paths can expose job-platform account state
- network_behavior: accesses supported job platforms; optional AI provider integration
- credential_requirements: platform login/session for authenticated features; optional AI provider credentials
- safety_flags: CDP/browser session access; employment-platform automation can cross into sensitive outreach or personal-data handling
- legal_flags: platform ToS/rate limits apply; bulk outreach, risk-control bypass and candidate personal-data workflows must remain blocked
- project_matches:
  - tutoring/job-search workflow: high fit for read-only candidate-side search and local shortlist
  - AI/Coding Agent: high fit for schema-first tools plus explicit low-risk mode
- integration_status: proposed read-only architecture only; not installed
- acceptance_criteria: search/detail/shortlist only, no auto-apply, no bulk greeting, no recruiter-side personal-data workflows, no risk-control bypass, manual confirmation on the official platform before any external action, and no browser-session reuse outside a dedicated profile
- rollback_plan: remove isolated adapter/config; keep canonical shortlist export only
- last_verified_at: 2026-09-07

## memory-forge-rs

- name: Memory Forge RS
- resource_type: repository / desktop session editor
- telegram_last_seen: 2026-09-07
- canonical_source: https://github.com/voidcraft-dev/memory-forge-rs
- publisher_or_owner: voidcraft-dev
- license: MIT
- platforms: Windows / macOS / Linux desktop; Tauri + Rust
- maintenance_state: active repository; pushed 2026-08-12
- purpose: inspect and edit local AI coding-assistant conversation/session history
- privacy_notes: repository describes offline/local operation; it intentionally reads and can mutate sensitive local assistant histories
- network_behavior: core use is offline; risk is primarily local filesystem/session integrity rather than network exfiltration
- credential_requirements: none for core local operation
- safety_flags: direct historical mutation can break provenance, auditability, session integrity, or create false context
- legal_flags: normal MIT software use; user remains responsible for tool/vendor session-file compatibility
- project_matches:
  - AI/Coding Agent anti-drift: high conceptual fit for correction and audit UX
  - research/learning: medium fit for reviewing session history
- integration_status: pattern-only; direct mutation model is not adopted
- acceptance_criteria: PAQ workflow may borrow diff/audit/fork UX only; canonical raw history must remain immutable, corrections must be append-only or forked, every correction records author/time/reason, and original evidence must remain readable
- rollback_plan: remove correction overlay/fork artifact without touching canonical session files
- last_verified_at: 2026-09-07

## pdfx-akii09

- name: PDFx (akii09)
- resource_type: repository / React PDF component library
- telegram_last_seen: 2026-09-07
- canonical_source: https://github.com/akii09/pdfx
- publisher_or_owner: akii09 / Akii
- license: MIT (verified from repository LICENSE; GitHub metadata currently reports NOASSERTION)
- platforms: React / Next.js / TypeScript build environments
- maintenance_state: maintained; repository pushed 2026-08-17
- purpose: pre-built themeable React PDF components copied into the consuming project; built on @react-pdf/renderer
- privacy_notes: component library itself does not require cloud processing; privacy depends on the host application and any optional AI authoring workflow
- network_behavior: no PDFx runtime service required for copied components; CLI/package acquisition still creates normal npm supply-chain exposure
- credential_requirements: none for the open-source component workflow
- safety_flags: npm/CLI supply-chain risk; generated PDFs can accidentally embed sensitive source data if host code passes it
- legal_flags: MIT; document templates/content/fonts remain separately licensed
- project_matches:
  - personal website/resume: high fit for deterministic PDF export
  - Lumen: medium fit for local/static market report export, provided provenance remains visible and no market data is synthesized
  - research/learning: high fit for reproducible report/worksheet generation
  - Atlas Reader: low-medium fit for export, not ingestion
- integration_status: candidate only; no dependency added
- acceptance_criteria: pin package/version or vendor reviewed components, no hosted render API, deterministic fixture PDF test, provenance fields preserved for Lumen exports, no secrets in generated documents, and removal must leave the existing web app unchanged
- rollback_plan: remove copied PDF components/isolated export route and dependency lockfile changes in one PR
- last_verified_at: 2026-09-07

## national-anti-fraud-ai-cn

- name: 國家反詐AI
- resource_type: government app / mini-program / information service
- telegram_last_seen: 2026-09-06
- canonical_source: official announcement attributed to the Ministry of Public Security Criminal Investigation Bureau / Shanghai Public Security; independently confirmed by Xinhua-syndicated and China Daily reporting on 2026-09-06
- publisher_or_owner: developed by Shanghai Public Security under guidance of the Ministry of Public Security Criminal Investigation Bureau
- license: not applicable / proprietary government service
- platforms: mobile app stores; WeChat and Alipay mini-programs
- maintenance_state: newly launched as of 2026-09-06
- purpose: fraud-risk Q&A, anti-fraud alerts, case education and searchable anti-fraud references
- privacy_notes: not treated as local-first; users should avoid submitting unrelated secrets, private source code, credentials, or unnecessary personal data
- network_behavior: online service
- credential_requirements: depends on app/mini-program distribution flow; not evaluated for project integration
- safety_flags: high-stakes advisory output must not be treated as infallible; false positives/negatives remain possible
- legal_flags: official public-safety service; jurisdiction-specific
- project_matches:
  - security-awareness workflow: medium fit as an external official reference
  - AI/Coding Agent: low fit; can inspire evidence-backed risk explanation, not runtime integration
- integration_status: reference-only; no app installation or API integration
- acceptance_criteria: any citation must identify it as an official external advisory source, retain independent evidence, and never upload project secrets or user private data for automated checking
- rollback_plan: remove external reference; no code or account changes
- last_verified_at: 2026-09-07
