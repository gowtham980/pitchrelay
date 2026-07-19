# PitchRelay architecture

## Layering

```
src/app            → Next.js routes (UI pages + thin API handlers)
src/components     → Presentational React UI
src/hooks          → Client data-loading hooks
src/services       → Use-cases (assist, decisions, scenarios, rag, llm)
src/domain         → Pure domain (graph, router, risk, schemas, lang)
src/lib            → Infra helpers (store, security, api, utils)
data/              → Seed graph, KB markdown, scenario JSON
```

**Dependency rule:** `app/components → services/hooks → domain/lib → data`.  
Domain modules must not import from `app` or `components`.

## Key flows

### Fan assist
1. `POST /api/assist` validates body with Zod  
2. `detectLang` + route extraction + Dijkstra (`ada` filters stairs)  
3. Keyword RAG over `data/kb` + graph facts  
4. Live LLM if configured, else deterministic mock answer  

### Ops decision card
1. Incident or freeform prompt  
2. Live LLM JSON → Zod `DecisionCardSchema`, else `decisionTemplates` mock  
3. Card attached to in-memory store / incident  

### Scenarios
JSON injectors mutate telemetry + mint incidents + cards for demos.

## In-memory store
`src/lib/store.ts` holds process-local venue state (graph, telemetry, incidents, cards).  
Fine for hackathon demo / single Cloud Run instance (`max-instances=1`).

## Security boundaries
- Zod on mutating/assist bodies  
- Per-route rate limits  
- Optional `DEMO_WRITE_KEY` for non-same-origin writes  
- Middleware security headers + CSP baseline  

## Testing pyramid
- Domain unit tests (router/ADA, risk, schema, lang, min-heap)  
- Service smoke tests (assist, decisions, scenarios)  
- Security unit tests (write guard, rate limit)  
