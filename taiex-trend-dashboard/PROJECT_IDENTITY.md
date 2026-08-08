# Project Identity — 台股分析平台

## Canonical identity

- Project: 台股分析平台
- Canonical source: `PAQ6809/PAQ6809.github.io/taiex-trend-dashboard/`
- Public GitHub Pages path: `https://paq6809.github.io/taiex-trend-dashboard/`
- Market maintenance schedule: every day at 08:30 and 21:30 Asia/Taipei

## Hard boundary

This project is NOT the story / novel creation website.

The story project and its deployment are separate. The stock-analysis scheduler must never read from, write to, deploy to, or inject financial analysis into the story project.

Do not infer project identity from legacy internal filenames such as `lumen.js`, `lumen-*.js`, `lumen.css`, or the historical storage table name `lumen_workspaces`. Those names are retained only for backward compatibility and are not deployment routing signals.

## Automation routing

Scheduled market jobs may modify only verified stock-analysis assets belonging to this project. If a target repository, branch, deployment, route, environment variable, README, or URL cannot be verified as part of the stock-analysis project, treat it as out of scope and do not write to it.

Explicitly exclude unrelated projects including the story / novel website, Global Earnings Radar, Atlas Reader, EduCraft, ReelScribe, and any other repository not verified as part of this stock-analysis platform.

## Data policy

Use current publicly available market data at execution time. Prefer TWSE, TPEx, MOPS, TAIFEX, company investor-relations disclosures, and appropriate official or first-party international macro/market sources. Preserve source URL, as-of time, fetched-at time, freshness/status, and methodology where needed. Never fabricate missing or delayed values.
