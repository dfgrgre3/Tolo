# Database Migration Scripts

## Quick Start

### Option 1: PowerShell Script (Recommended)
```powershell
# From the backend directory
cd d:\thanawy\backend

# Make sure DATABASE_URL is set in your .env file
# Then run:
.\scripts\run-migrations.ps1

# Or with explicit database URL:
.\scripts\run-migrations.ps1 -DatabaseUrl "postgresql://user:pass@localhost:5432/thanawy"

# Dry run (show what would be applied without executing):
.\scripts\run-migrations.ps1 -DryRun

# Force reapply all migrations:
.\scripts\run-migrations.ps1 -Force
```

### Option 2: SQL Script (Direct PostgreSQL)
```bash
# Using psql
psql $DATABASE_URL -f scripts/apply-migration-0009.sql

# Or with explicit connection
psql "postgresql://user:pass@localhost:5432/thanawy" -f scripts/apply-migration-0009.sql
```

### Option 3: Via Go Backend
```powershell
# Set environment variable and run the backend
$env:RUN_DB_MIGRATIONS="true"
go run cmd/api/main.go
```

## What Gets Fixed

This migration fixes the following database schema issues:

1. **User.deleted_at** - Adds soft delete support to User table
2. **SecurityLog.user_id** - Adds foreign key to User table (fixes column naming issue)
3. **SystemSetting table** - Creates table for application settings
4. **AuditLog table** - Creates table for admin audit logs
5. **IP Whitelist tables** - Creates security-related tables

## Troubleshooting

### Error: "psql not found"
Install PostgreSQL client tools and add to PATH:
- Windows: Install from https://postgresql.org/download/windows/
- Or use `choco install postgresql`

### Error: "Permission denied"
Ensure your database user has CREATE TABLE and ALTER TABLE permissions.

### Error: "Column already exists"
The scripts are idempotent (safe to run multiple times). This error can be ignored.

## Verify Migration Success

After running, check the logs for:
```
✓ Table User exists
✓ Table SystemSetting exists
✓ Table AuditLog exists
✓ Table SecurityLog exists
✓ Column User.deleted_at exists
✓ Column SecurityLog.user_id exists
```

## Manual Verification

Run this SQL to verify schema:
```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('User', 'SystemSetting', 'AuditLog', 'SecurityLog');

-- Check columns
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE (table_name = 'User' AND column_name = 'deleted_at')
   OR (table_name = 'SecurityLog' AND column_name = 'user_id');
```
