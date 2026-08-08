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
- Updated Lumen CI so it validates the modular runtime, source contract, cloud module and absence of server-side credential patterns.
- Added a visible maintenance/deployment status card backed by `maintenance-latest.json`.
- Migrated the previously disabled market-radar ChatGPT task into the active `Lumen 雙時段更新` task.
- Enabled the exact Asia/Taipei schedule at 08:30 and 21:30 every day, beginning with the next run at 2026-08-08 21:30.

## Latest verified market state

The 08:30 maintenance record on 2026-08-08 correctly identifies Taiwan as closed for the weekend and uses 2026-08-07 as the latest Taiwan trading day. The website itself fetches market-critical official endpoints with `no-store` on page load and on manual refresh, so it does not depend on a static daily price snapshot.

## External boundaries that are intentionally not represented as complete

- `lumen-script.pages.dev` cannot be claimed synchronized until its writable Cloudflare Pages project is connected and deployment can be verified. The canonical GitHub source is updated; Cloudflare write access is still unverified.
- This conversation has no connector for deleting schedules stored inside the user's local Codex environment. The GitHub repository was checked and no scheduled Lumen cron workflow was found that needed removal.
- The shared Supabase project has project-wide security-advisor warnings for unrelated applications and leaked-password protection is currently disabled at the Auth-project level. Lumen's own `lumen_workspaces` table has RLS and owner-only policies; unrelated project tables/functions are not modified by this Lumen refactor.

## Source and analysis policy

- Financial values require a primary or clearly identified trusted source.
- Source data date and page/maintenance fetch time are separate fields.
- Missing, delayed or structurally ambiguous data is shown as missing rather than inferred.
- Technical indicators and sentiment are identified as Lumen calculations/rules, not exchange-native fields or guaranteed forecasts.
- External news is discovery/context only; financial figures must be re-verified against TWSE, TPEx, MOPS, TAIFEX, company filings or other relevant primary sources.
