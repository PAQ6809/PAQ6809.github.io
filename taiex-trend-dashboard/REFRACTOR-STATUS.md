# Lumen production refactor status

Completed in the 2026-08-08 ChatGPT conversation for the canonical GitHub source `PAQ6809/PAQ6809.github.io/taiex-trend-dashboard/`.

Completed:
- Consolidated duplicate market/navigation information into six canonical views.
- Replaced the duplicate runtime-patch architecture with ordered canonical JS modules.
- Added official-source TWSE + TPEx search, normalized OHLC K-line history and technical indicators.
- Expanded listed and OTC fundamentals, valuation, peer comparison and institutional data.
- Added structured TAIFEX institutional derivatives and Put/Call Ratio endpoints.
- Added source-backed market sentiment with transparent fixed rules.
- Added multi-workspace LocalStorage persistence, notes, JSON import/export and URL-fragment transfer.
- Added optional account-based private cloud sync using Supabase Auth and `public.lumen_workspaces`.
- Enabled RLS owner-only SELECT / INSERT / UPDATE / DELETE policies for Lumen cloud workspaces and removed anon table access.
- Corrected and expanded `source-manifest.json` with verified official endpoints and cloud persistence boundaries.
- Removed obsolete `lumen-runtime-fixes.js`.
- Updated Lumen CI so it validates the modular runtime, source contract, cloud module and absence of server-side credential patterns.

External blockers that are intentionally not represented as complete:
- `lumen-script.pages.dev` requires access to its writable Cloudflare Pages project before deployment can be verified.
- The ChatGPT 08:30 / 21:30 schedule is configured but cannot be enabled while all five active task slots are occupied.
- This conversation has no connector for deleting schedules stored inside the user's local Codex environment.
