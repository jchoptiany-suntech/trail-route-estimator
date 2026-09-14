# Review Fix Queue

## F4 — Migration scope traceability

- Include `supabase/migrations/20260914001000_backfill_route_hash_shape_v2.sql` in the next commit for this change.
- Rationale: remote migration push required schema-qualified `extensions.digest(...)` to work in environments where `pgcrypto` is installed in `extensions` schema.
- Acceptance: repository history contains the migration fix commit message referencing this change review.
