# Lumen production refactor status

Updated in the 2026-08-08 ChatGPT conversation for the canonical GitHub source `PAQ6809/PAQ6809.github.io/taiex-trend-dashboard/`.

## Completed and online in the canonical source

- Consolidated duplicate market/navigation information into six canonical views.
- Replaced the duplicate runtime-patch architecture with ordered canonical JS modules.
- Added official-source TWSE + TPEx search, normalized OHLC K-line history and technical indicators.
- Expanded listed and OTC fundamentals, valuation, peer comparison and institutional data.
- Added structured TAIFEX institutional derivatives and Put/Call Ratio endpoints.
- Added source-backed market sentiment with transparent fixed rules.
- Added multi-workspace LocalStorage persistence, notes, JSON import/export and URL-fragment transfer.
- Added optional account-based private cloud sync using Supabase Auth and `public.lumen_workspaces`.
- Verified `public.lumen_workspaces` has RLS enabled and owner-only SELECT / INSERT / UPDATE / DELETE policies for `authenticated`.
- Corrected and expanded `source-manifest.json` with official endpoints, data/fetch-time rules, cloud persistence boundaries and deployment status.
- Removed obsolete `lumen-runtime-fixes.js` and other duplicate runtime behavior.
- Added a visible maintenance/deployment status card backed by `maintenance-latest.json`.
- Migrated the previously disabled market-radar ChatGPT task into the active `Lumen 雙時段更新` task at 08:30 and 21:30 Asia/Taipei.
- Added `qa-contract.json` as the canonical full-regression contract. Every future maintenance update is required to use the sequence: analyze first in the ChatGPT run → verify primary sources → make only necessary minimal changes → re-run the complete data/interaction contract → record failures before reporting healthy.
- Expanded GitHub Actions so every change under `taiex-trend-dashboard/**` checks JS syntax, canonical module order, required DOM IDs, source policy, the QA contract, stock-tab renderers, static control event bindings, dynamic navigation contracts, source-link safety, required official domains, maintenance metadata and forbidden frontend secret patterns.

## Full information and interaction regression policy

The Taiwan security universe is the union of securities successfully returned by the official TWSE listed quote feed and TPEx mainboard quote feed. Every returned security must remain searchable by code or name while preserving market identity. The canonical stock research surface covers official daily quote/OHLC, six-month official history, MA5/20/60, RSI14, MACD + signal, transparent technical trend rule, company/industry profile, monthly revenue, income-statement summary, balance-sheet summary, EPS where an official field exists, P/E, P/B, dividend yield, official industry peers, institutional/chip data, market margin/short context, material information, external-news discovery with primary-source reverification, raw source links, source date, fetch time and explicit missing/error states.

Every update must also re-check the six main views and all required controls: official-data refresh, stock search button and Enter key, ETF filter, watch toggle, copy-stock link, workspace switch/new/delete/export/import/copy-link/note persistence, main navigation, every stock tab, peer/stock row navigation, derivatives navigation and source hyperlinks. A previous successful result is not reusable evidence for the next maintenance run.

A required check failure means the maintenance run may not be labeled healthy or complete. It must be written to `maintenance-latest.json` with the failed source, module, control or CI state. GitHub CI must not be claimed as passed unless an explicit successful status is available.

## Latest verified market state

2026-08-08 is Saturday in Taiwan, so 2026-08-07 remains the latest official Taiwan trading day. The website fetches market-critical official endpoints with `no-store` on page load and manual refresh rather than presenting weekend data as a new trading day.

## External boundaries that are intentionally not represented as complete

- `lumen-script.pages.dev` cannot be claimed synchronized until its writable Cloudflare Pages project is connected and deployment can be verified. The canonical GitHub source is updated; Cloudflare write access is still unverified.
- This conversation has no connector for deleting schedules stored inside the user's local Codex environment. The GitHub repository was checked and no scheduled Lumen cron workflow was found that needed removal.
- The ChatGPT automation remains enabled at 08:30/21:30. A later attempt in this conversation to rewrite its prompt with an even more explicit button-by-button checklist returned an automation-tool error, so that prompt rewrite is not claimed as applied. The repository-level `qa-contract.json` and GitHub Action now enforce the full interaction contract whenever a Lumen maintenance commit is made.
- The latest GitHub combined-status query for the new QA workflow commit returned no status records, so CI success is not yet claimed.
- The shared Supabase project has project-wide security-advisor warnings for unrelated applications and leaked-password protection is currently disabled at the Auth-project level. Lumen's own `lumen_workspaces` table has RLS and owner-only policies; unrelated project tables/functions are not modified by this Lumen refactor.

## Source and analysis policy

- Financial values require a primary or clearly identified trusted source.
- Source data date and page/maintenance fetch time are separate fields.
- Missing, delayed or structurally ambiguous data is shown as missing rather than inferred.
- Technical indicators and sentiment are identified as Lumen calculations/rules, not exchange-native fields or guaranteed forecasts.
- External news is discovery/context only; financial figures must be re-verified against TWSE, TPEx, MOPS, TAIFEX, company filings or other relevant primary sources.
