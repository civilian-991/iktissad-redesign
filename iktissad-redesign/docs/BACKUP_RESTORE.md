# Database Backup & Restore

## Supabase Backup Policy

### Automatic Backups (Managed by Supabase)

| Plan | Frequency | Retention | Point-in-Time Recovery |
|------|-----------|-----------|----------------------|
| Free | None | N/A | No |
| Pro | Daily | 7 days | Yes (up to 7 days) |
| Team | Daily | 14 days | Yes (up to 14 days) |
| Enterprise | Daily | 30 days | Yes (up to 30 days) |

Backups are taken automatically by Supabase and include:
- All database tables and data
- Database functions, triggers, and extensions
- RLS policies and roles

Backups do **NOT** include:
- Storage bucket files (managed separately)
- Auth user sessions (ephemeral)
- Realtime subscriptions state

### Point-in-Time Recovery (PITR)

Available on Pro plan and above. Allows restoring to any point within the retention window.

## Manual Backup Procedure

### 1. Database Export

```bash
# Full database dump (requires direct connection string)
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

To get the connection string:
1. Supabase Dashboard → Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your database password

### 2. Storage Backup

```bash
# Using Supabase CLI (install: npm i -g supabase)
# Export each bucket
for bucket in articles magazines media avatars; do
  supabase storage cp -r "sb://$bucket" "./storage_backup/$bucket/"
done
```

### 3. Auth Users Export

Auth users cannot be directly exported. To migrate users:
1. Use the Supabase Management API: `GET /v1/projects/{ref}/auth/users`
2. Or export via SQL: `SELECT * FROM auth.users;` (requires service role)

## Restore Procedure

### Restore from Supabase Dashboard (Easiest)

1. Go to Supabase Dashboard → Project → Database → Backups
2. Select the backup point to restore
3. Click "Restore" and confirm
4. Wait for restore to complete (can take several minutes for large databases)
5. Verify the application works after restore

### Restore from pg_dump

```bash
# Drop and recreate (DESTRUCTIVE — use only on staging or after confirming)
pg_restore \
  --dbname="$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  backup_YYYYMMDD_HHMMSS.dump
```

### Restore from Migrations (Clean Setup)

If restoring from scratch (e.g., new Supabase project):

```bash
# Run all migrations in order
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done

# Seed initial data
psql "$DATABASE_URL" -f supabase/seed.sql
```

### Restore Storage

```bash
for bucket in articles magazines media avatars; do
  supabase storage cp -r "./storage_backup/$bucket/" "sb://$bucket/"
done
```

## Post-Restore Verification Checklist

- [ ] `/api/health` returns `{ status: "healthy" }`
- [ ] Homepage loads with articles
- [ ] Admin login works
- [ ] Article CRUD operations work
- [ ] Image uploads work (Storage buckets accessible)
- [ ] Newsletter subscriber count matches expected
- [ ] Magazine issues are accessible
- [ ] Sentry shows no new errors after restore

## Monitoring

The `/api/admin/backup-status` endpoint provides:
- Last backup timestamp (from Supabase project metadata)
- Database size
- Table count
- Connection health

Check it from the admin dashboard or via:
```bash
curl -H "Cookie: <session>" https://www.iktissadonline.com/api/admin/backup-status
```

## Emergency Contacts

- Supabase Support: support@supabase.io (Pro plan includes priority support)
- Supabase Status: https://status.supabase.com
