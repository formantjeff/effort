#!/bin/bash

# Supabase project details
PROJECT_REF="ypkhawzbhrmwiqxmlenr"
ACCESS_TOKEN="sbp_bbce7125cf7a90590b1582ac4885bc3098e47d33"
SUPABASE_URL="https://ypkhawzbhrmwiqxmlenr.supabase.co"
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

echo "Applying user_preferences migration..."
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(cat supabase/migrations/20251008162700_add_user_preferences.sql | jq -Rs '{query: .}')"

echo ""
echo "Applying shared_efforts migration..."
curl -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$(cat supabase/migrations/20251008164200_add_shared_efforts.sql | jq -Rs '{query: .}')"

echo ""
echo "Migrations applied!"
