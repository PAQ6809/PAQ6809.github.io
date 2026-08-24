# Atlas Reader verification matrix

A maintenance change is not mergeable until all applicable checks are green.

| Area | Required evidence |
| --- | --- |
| Startup | Mobile browser reaches the main heading within 4 seconds and SAFE RECOVERY is absent |
| Search | Built-in `漫畫` query returns `sample-comic`; controlled impossible query returns zero results without error |
| URL import | Legal HTTPS metadata parses; non-HTTPS/private host/Telegram direct-fetch are rejected |
| Readers | Comic, text, video and PDF flows open and return successfully |
| Edge API | Health returns `ok=true`, version and feature set are expected |
| CI runtime | Node.js 24-compatible pinned checkout/upload actions run without Node 20 deprecation warnings |
| Production | Current GitHub Pages propagation and public Vercel mobile entry pass a read-only smoke test |
| Database proposal | No production DDL/RLS/Auth change until owner/non-owner/anonymous/service-role regression tests pass |
