#!/usr/bin/env bash
# Regenerates lib/supabase/database.types.ts from the live Supabase schema.
# Needs SUPABASE_PROJECT_ID (CLI only, never read by the app) and a logged-in
# Supabase CLI (`npx supabase login`) or SUPABASE_ACCESS_TOKEN.
set -euo pipefail

if [ -z "${SUPABASE_PROJECT_ID:-}" ]; then
  echo "SUPABASE_PROJECT_ID is not set" >&2
  exit 1
fi

npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public > lib/supabase/database.types.ts
