# SQLite to PostgreSQL Migration - Summary

## Files Changed

### New Files Created
1. `backend/database/schema_postgres.sql` - PostgreSQL schema (converted from SQLite)
2. `backend/scripts/db_smoketest.py` - Database smoke test for validation
3. `backend/scripts/test_query_conversion.py` - Unit tests for query conversion logic
4. `Procfile` - Heroku process definition
5. `runtime.txt` - Python runtime specification for Heroku
6. `requirements.txt` (root) - Dependencies for Heroku deployment
7. `HEROKU_DEPLOYMENT.md` - Comprehensive deployment guide

### Modified Files
1. `backend/database/db.py` - Updated to support both SQLite and PostgreSQL
   - Auto-detects DATABASE_URL environment variable
   - Converts `?` placeholders to `%s` for Postgres
   - Converts SQLite `strftime()` to Postgres `EXTRACT()`
   - Adds RETURNING clause for INSERT statements in Postgres
   - Returns dict-like rows for both databases

2. `backend/requirements.txt` - Added psycopg2-binary==2.9.9

3. `backend/app.py` - Updated for Heroku deployment
   - Binds to 0.0.0.0 when DATABASE_URL is set
   - Disables debug mode in production

4. `README.md` - Added database configuration and deployment documentation

## Schema Changes (SQLite → PostgreSQL)

| SQLite Syntax | PostgreSQL Equivalent |
|---------------|----------------------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL PRIMARY KEY` |
| `TIMESTAMP DEFAULT CURRENT_TIMESTAMP` | `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP` |
| `?` (placeholder) | `%s` (placeholder) |
| `strftime('%Y', column)` | `EXTRACT(YEAR FROM column)::TEXT` |
| `INSERT ... RETURNING` (limited) | `INSERT ... RETURNING id` (full support) |
| `INSERT OR IGNORE` | `INSERT ... ON CONFLICT DO NOTHING` (already compatible) |

## Database Layer Features

### Automatic Query Conversion
The updated `backend/database/db.py` automatically:
- Converts `?` to `%s` placeholders
- Converts `strftime('%Y', col)` to `EXTRACT(YEAR FROM col)::TEXT`
- Adds `RETURNING id` to INSERT statements for Postgres
- Returns consistent dict-like rows from both databases

### Dual Database Support
- **Production (Heroku)**: Uses PostgreSQL when `DATABASE_URL` is set
- **Local Development**: Uses SQLite when `DATABASE_URL` is not set
- No code changes needed in service layer
- All existing queries work with both databases

## Service Layer - No Changes Required

The following files require **NO modifications**:
- `backend/services/book_service.py`
- `backend/services/ranking_service.py`
- `backend/services/tag_service.py`
- `backend/services/goal_service.py`
- `backend/services/continuation_service.py`
- `backend/services/metadata_service.py`
- `backend/services/cover_service.py`

All queries continue to use `?` placeholders and SQLite syntax. The database layer handles conversion transparently.

## Testing

### Local SQLite Test
```bash
cd backend
python3 scripts/db_smoketest.py
```
Result: All tests pass with local SQLite database

### Postgres Query Conversion Test
```bash
cd backend
python3 scripts/test_query_conversion.py
```
Result: All query conversion patterns validated

### Heroku Postgres Test (After Deployment)
```bash
heroku run -a bookshelf-hermes python backend/scripts/db_smoketest.py
```
Expected: All tests pass with Heroku Postgres database

## Deployment Sequence

1. **Apply Schema to Heroku Postgres**
   ```bash
   heroku pg:psql -a bookshelf-hermes < backend/database/schema_postgres.sql
   ```

2. **Verify Schema**
   ```bash
   heroku pg:psql -a bookshelf-hermes
   \dt
   \q
   ```

3. **Deploy Application**
   ```bash
   git add .
   git commit -m "Add Postgres support for Heroku deployment"
   git push heroku main
   ```

4. **Run Smoke Test**
   ```bash
   heroku run -a bookshelf-hermes python backend/scripts/db_smoketest.py
   ```

5. **Verify Application**
   ```bash
   heroku logs --tail -a bookshelf-hermes
   heroku open -a bookshelf-hermes
   ```

## Known Limitations (Phase 1)

### In Scope
- ✅ SQLite → PostgreSQL database migration
- ✅ Dual database support (local dev + production)
- ✅ Automatic query conversion
- ✅ Schema validation
- ✅ Smoke tests
- ✅ Deployment documentation

### Out of Scope (Future Phases)
- ❌ File storage migration (spine_images still on ephemeral filesystem)
- ❌ Authentication and user accounts
- ❌ Multi-user support
- ❌ S3 integration for spine images
- ❌ Database backups automation
- ❌ CI/CD pipeline

## File Storage Note

**Important**: Spine image uploads currently save to the local filesystem (`data/spine_images/`). On Heroku, this filesystem is ephemeral and will be wiped on each dyno restart. For Phase 1, this is acceptable. Phase 2 should implement S3 storage for spine images.

Affected endpoints:
- `POST /api/books/:id/spine` - Upload spine image
- `GET /spine_images/:filename` - Serve spine image

## Environment Variables

### Required in Production
- `DATABASE_URL` - Automatically set by Heroku Postgres addon
- `PORT` - Automatically set by Heroku

### Optional
- `HOST` - Defaults to 0.0.0.0 in production, localhost in dev
- `SPINE_IMAGES_PATH` - Path for spine images (default: data/spine_images)

## Rollback Plan

If deployment fails:

1. **Revert Git Commits**
   ```bash
   git revert HEAD
   git push heroku main
   ```

2. **Or Rollback on Heroku**
   ```bash
   heroku rollback -a bookshelf-hermes
   ```

3. **Database State**
   - Schema changes are additive only (CREATE TABLE IF NOT EXISTS)
   - Safe to re-run schema script
   - No data loss in production (tables remain even if app fails)

## Success Criteria

Migration is successful when:
- ✅ Smoke test passes on Heroku
- ✅ All API endpoints return correct data
- ✅ Books can be created, read, updated, deleted
- ✅ Reading states can be managed
- ✅ Rankings work correctly
- ✅ Tags can be created and assigned
- ✅ Goals can be set and tracked
- ✅ Thought continuations can be linked
- ✅ No SQL syntax errors in logs
- ✅ App stays running (no crashes)

## Verification Checklist

After deployment, verify:

```bash
# 1. App is running
heroku ps -a bookshelf-hermes

# 2. Database is connected
heroku pg:info -a bookshelf-hermes

# 3. Smoke test passes
heroku run -a bookshelf-hermes python backend/scripts/db_smoketest.py

# 4. No errors in logs
heroku logs --tail -a bookshelf-hermes

# 5. Health check passes
curl https://bookshelf-hermes.herokuapp.com/api/health

# 6. Can create a book
curl -X POST https://bookshelf-hermes.herokuapp.com/api/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","author":"Test Author"}'

# 7. Can list books
curl https://bookshelf-hermes.herokuapp.com/api/books
```

## Next Steps

After successful Phase 1 deployment:

1. Monitor Heroku logs for any issues
2. Test all UI features in production
3. Plan Phase 2: File storage migration to S3
4. Consider implementing database backups
5. Plan authentication and multi-user support

