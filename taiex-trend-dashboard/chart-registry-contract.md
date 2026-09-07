# Lumen Chart Registry Contract

Purpose: define a single source of truth for visualization metadata without changing Lumen runtime behavior or financial data provenance.

## Design source

This contract borrows the registry-driven chart catalog pattern validated in VizPilot AI. It does not copy VizPilot runtime code and introduces no dependency.

## Registry principles

1. One registry is the canonical catalog for chart metadata.
2. Chart implementation and metadata stay decoupled.
3. Adding a chart must not require editing unrelated rendering logic.
4. Financial source provenance remains governed by Lumen's existing source-first rules; chart metadata must never override or synthesize market data.
5. Missing or unverified datasets must render as unavailable, never as guessed values.

## Required chart metadata

Each future chart entry should declare at minimum:

- `id`: stable unique identifier
- `title`: Traditional Chinese display name
- `domain`: market / technical / institutional / macro / derivatives / etf / company
- `required_datasets`: canonical dataset identifiers already defined by Lumen catalogs
- `supported_security_types`: stock / etf / index / futures / all
- `renderer`: deterministic renderer identifier
- `empty_state`: explicit missing-data behavior
- `provenance_required`: always `true` for financial charts
- `experimental`: boolean gate for non-production charts

## Runtime guardrails

A future implementation must fail closed when required datasets are not verified. The registry may choose presentation and field mapping, but must not fetch data, infer missing financial values, replace official sources, or route through non-allowlisted transports.

Charts derived from calculations such as MA, RSI, or MACD must expose the underlying official OHLC provenance plus the fact that the indicator is Lumen-computed.

## Acceptance criteria for future runtime implementation

- Existing charts behave identically when registry support is disabled.
- No canonical data source or transport policy changes.
- No third-party chart recommendation service is required at runtime.
- No API key or secret is added.
- Unsupported security type + chart combinations fail closed.
- Missing verified data produces an explicit empty state.
- Every financial visualization preserves source URL, data date, and fetch timestamp where available.
- Adding one chart requires only a renderer module plus one registry entry.
- Static checks and existing Lumen snapshot/context/ETF checks remain green before merge.

## Rollback

This document is non-runtime. Rollback is deleting this file or closing the associated draft PR. Production behavior remains unchanged until a separate reviewed implementation is proposed.
