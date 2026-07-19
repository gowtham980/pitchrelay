# Code quality pass — PitchRelay

Date: 2026-07-19

## Goal

Raise structure, readability, and maintainability without changing product behavior, UI copy, security guards, or the mock-LLM default.

## Files changed

### New modules
- `src/domain/minHeap.ts` — extracted binary min-heap used by Dijkstra
- `src/lib/api.ts` — shared `jsonError`, `jsonOk`, `parseJsonBody`, `handleRoute`
- `src/services/decisionMock.ts` — pure-ish mock decision card builders
- `src/services/decisionLive.ts` — live LLM decision path + safer JSON parse
- `src/__tests__/minHeap.test.ts` — focused unit tests for the extracted heap

### Refactored
- `src/services/decisions.ts` — thin public facade (`generateDecisionCard` export stable)
- `src/domain/router.ts` — uses shared `MinHeap`; clearer `viaPhrase` helper
- `src/lib/store.ts` — singleton comment; tighter `StoreGlobal` typing; dropped redundant `as` on `structuredClone`
- `src/services/scenarios.ts` — explicit return types for incidents/cards/telemetry
- API routes using shared helpers:
  - `src/app/api/assist/route.ts`
  - `src/app/api/decisions/route.ts`
  - `src/app/api/incidents/route.ts`
  - `src/app/api/route/route.ts`
  - `src/app/api/telemetry/route.ts`
  - `src/app/api/telemetry/tick/route.ts`
  - `src/app/api/venue/route.ts`
  - `src/app/api/scenarios/[id]/run/route.ts`

### Docs
- `docs/code-quality-kimi.md` (this file)

## What improved

1. **God-file pressure reduced**
   - `decisions.ts` (~320 lines of mixed mock/live/public API) split into mock builders, live path, and a small stable facade.
   - Mock content is named helpers (`medicalActions`, `weatherComms`, etc.) instead of long nested branches.

2. **Router clarity**
   - `MinHeap` lives in its own module and is unit-tested independently of graph routing.
   - Edge step phrasing extracted to `viaPhrase`.

3. **API route consistency**
   - Repeated try/catch + `NextResponse.json({ error })` patterns centralized.
   - Zod body parsing + invalid-body responses share one helper with correct `z.output` typing (preserves Zod defaults like `role`).
   - Rate-limit / write-guard / middleware paths left intact and still called first.

4. **Types & maintainability**
   - Safer live-LLM JSON handling (`unknown` parse gate before schema).
   - Filter type predicates instead of `as string[]` in decision services.
   - Explicit `runScenario` return typing.
   - Short module-top notes only where non-obvious (store singleton, decision facade).

## Test / build result

```text
npm test  →  8 files, 39 tests passed (including 2 new MinHeap tests)
npm run build → success (Next.js 15 production build + typecheck)
```

Mock LLM remains the default (`LLM_PROVIDER` unset / `mock`).

## Follow-ups skipped (intentionally)

- No UI/component refactors or copy changes.
- No dependency additions.
- Did not extract further scenario/RAG/assist god paths (lower pressure than decisions).
- Did not introduce a full typed graph loader (seed JSON still `JSON.parse` + structural trust).
- Did not add HTTP-level route integration tests (existing service-layer smoke tests remain).
- Health route left minimal (no error helper needed).
