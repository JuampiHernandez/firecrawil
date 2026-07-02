# Scan Storage System

## Goal

Avoid wasting Firecrawl and AI credits by storing every completed audit and generated report exactly once, then serving cached data for repeated URLs and related domains.

## Current Recovery Status

- `data/recovered-scan-cache.jsonl` contains recovered cache records.
- The Firecrawl platform scan was recovered as a complete `AuditResult` and can be imported into Supabase.
- The `docs.talent.app` artifact was recovered only as a pasted human report. It is preserved at `data/recovered-reports/docs-talent-app-human-report.md`, but it is not complete enough to populate `audits.result`.

Run this once Supabase is available:

```bash
npm run import:audit-cache
```

## Primary Storage

Supabase should remain the source of truth for both localhost and production:

- `audits`: one row per normalized host, keyed by `host_key`, with the full `AuditResult` in `result`.
- `reports`: one row per audit, keyed by `audit_id`, with the full generated `AuditReport` in `report`.
- Cache lookup order: exact `host_key`, then `root_domain`.
- Fresh scans and rescans: paid users only.
- Anonymous requests: fake locked preview only; never call Firecrawl.

## Localhost Fallback

Local development can safely append fallback records to local JSONL when Supabase is unavailable:

- Write complete audit records to `data/local-audit-cache.jsonl`.
- Write complete report records to the same JSONL file as `type: "report"`.
- Replay with `npm run import:audit-cache data/local-audit-cache.jsonl`.

Use JSONL instead of a single JSON array so each completed scan can be appended independently without corrupting the whole cache.

## Vercel Production Fallback

Do not rely on local files in production. Vercel serverless filesystems are not durable between invocations.

Production fallback should use one of these durable stores:

1. Supabase primary write.
2. If Supabase write fails after Firecrawl succeeds, write the full audit/report event to private Vercel Blob.
3. Add an admin replay script or protected route that imports pending Blob events into Supabase.
4. Delete or mark each Blob event as imported after successful Supabase upsert.

Recommended Blob object names:

```txt
audit-fallback/audits/{host_key}/{timestamp}.json
audit-fallback/reports/{host_key}/{timestamp}.json
```

Each object should use the same JSON shape accepted by `scripts/import-audit-cache.ts`.

## Write Flow

For `/api/audit`:

1. Require auth.
2. Check Supabase cache by `host_key`.
3. Check Supabase cache by `root_domain`.
4. If no cache, require paid user.
5. Run Firecrawl.
6. Try to upsert into Supabase.
7. If the upsert fails:
   - On localhost, append to JSONL.
   - On Vercel, write to private Blob.
8. Return the audit to the user with a storage status field.

For `/api/report`:

1. Require auth.
2. Check Supabase report cache by `audit_id`.
3. Generate the report only if no cached report exists.
4. Try to upsert into Supabase.
5. If the upsert fails:
   - On localhost, append to JSONL.
   - On Vercel, write to private Blob.
6. Return the report to the user with a storage status field.

## Required Environment Variables

Local and production:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FIRECRAWL_API_KEY=
```

Production fallback if using Vercel Blob:

```txt
BLOB_READ_WRITE_TOKEN=
```

## Notes

- Never store `SUPABASE_SERVICE_ROLE_KEY` or `BLOB_READ_WRITE_TOKEN` in `NEXT_PUBLIC_` variables.
- Do not insert partial legacy reports into Supabase unless a complete audit row exists and the report shape is intentionally accepted.
- Keep local JSONL cache files out of git if they contain customer scans or private scraped content.
