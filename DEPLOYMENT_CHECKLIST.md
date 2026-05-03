# 🚀 Deployment Checklist - Thanawy Production Hardening

## Pre-Deployment (يوم واحد قبل)

- [ ] **Code Review**
  - [ ] Review all new middleware code
  - [ ] Verify payment service transactions
  - [ ] Check rate limiting configuration
  - [ ] Validate JWT implementation

- [ ] **Database Preparation**
  - [ ] Backup database بالكامل
  ```bash
  pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup_$(date +%s).sql
  ```
  - [ ] Test migration locally أولاً
  ```bash
  migrate -path backend/internal/db/migrations -database "$DATABASE_URL" up
  ```
  - [ ] Verify no data loss
  - [ ] Document rollback procedure

- [ ] **Configuration**
  - [ ] Set .env variables:
    ```
    # JWT
    JWT_SECRET=<generate-strong-secret>
    
    # Rate Limiting
    RATE_LIMIT_LOGIN=5/minute
    RATE_LIMIT_AI_CHAT=100/day/user
    RATE_LIMIT_PAYMENT=5/hour/user
    
    # Database
    DB_MAX_OPEN_CONNS=200
    DB_MAX_IDLE_CONNS=20
    DB_CONN_MAX_LIFETIME_MINUTES=5
    DB_CONN_MAX_IDLE_MINUTES=2
    
    # Logging
    LOG_LEVEL=info
    
    # Redis
    REDIS_URL=redis://localhost:6379
    ```
  - [ ] Verify all secrets are secure (no hardcoding)
  - [ ] Check Redis connectivity
  - [ ] Validate database connection string

- [ ] **Testing Environment**
  - [ ] Deploy to staging
  - [ ] Run integration tests
  - [ ] Test payment flow end-to-end
  - [ ] Load test with 100 concurrent users
  - [ ] Verify health endpoints

---

## Deployment Steps (على الترتيب)

### Step 1: Database Migration (5 دقائق)
```bash
# Verify migration
migrate -path backend/internal/db/migrations \
        -database "$DATABASE_URL" version

# Apply migration
migrate -path backend/internal/db/migrations \
        -database "$DATABASE_URL" up

# Verify completion
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
  "SELECT EXISTS (SELECT 1 FROM \"DeletedRecordArchive\" LIMIT 1);"
# Should return: true
```

### Step 2: Backend Deployment (10-15 دقائق)
```bash
# Build new image
docker build -t thanawy-backend:new-hardened -f Dockerfile.backend .

# Test locally
docker run -e DATABASE_URL=$DATABASE_URL \
           -e REDIS_URL=$REDIS_URL \
           -p 8080:8080 \
           thanawy-backend:new-hardened

# Verify health check
curl http://localhost:8080/health

# If Kubernetes, update deployment
kubectl set image deployment/thanawy-backend \
  backend=thanawy-backend:new-hardened \
  --record

# Monitor rollout
kubectl rollout status deployment/thanawy-backend
```

### Step 3: Configuration Update (5 دقائق)
```bash
# Update environment variables
kubectl set env deployment/thanawy-backend \
  DB_MAX_OPEN_CONNS=200 \
  DB_MAX_IDLE_CONNS=20 \
  LOG_LEVEL=info

# Verify
kubectl describe deployment thanawy-backend | grep "DB_MAX"
```

### Step 4: Frontend Deployment (5-10 دقائق)
```bash
# No breaking changes, but update if needed
docker build -t thanawy-frontend:new -f Dockerfile .

# Deploy
kubectl set image deployment/thanawy-frontend \
  frontend=thanawy-frontend:new \
  --record

kubectl rollout status deployment/thanawy-frontend
```

### Step 5: Verification (10 دقائق)
```bash
# Health check
curl -s https://api.thanawy.app/health | jq .

# Check logs for errors
kubectl logs -f deployment/thanawy-backend --tail=100 | grep ERROR

# Test authentication
curl -H "Authorization: Bearer invalid" \
  https://api.thanawy.app/api/user
# Should return 401

# Test rate limiting
for i in {1..15}; do
  curl -H "Authorization: Bearer $TOKEN" \
    https://api.thanawy.app/api/ai/chat &
done
wait
# Last few should return 429

# Monitor metrics
# - Database connections
# - Redis memory
# - Request latency
# - Error rates
```

---

## Post-Deployment (ساعات 1-24)

### Immediate (ساعة الأولى)
- [ ] Monitor error logs in real-time
  ```bash
  kubectl logs -f deployment/thanawy-backend | grep -i error
  ```

- [ ] Check Kubernetes metrics
  ```bash
  kubectl top nodes
  kubectl top pods -l app=thanawy-backend
  ```

- [ ] Verify payment webhook still working
  - [ ] Test payment with test card
  - [ ] Verify enrollment created atomically
  - [ ] Check audit logs

- [ ] Test critical user flows
  - [ ] User registration
  - [ ] User login
  - [ ] Course enrollment
  - [ ] Payment processing
  - [ ] AI chat

### First Hour
- [ ] Monitor database connection pool
  ```bash
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \
    "SELECT count(*) FROM pg_stat_activity WHERE state='active';"
  ```

- [ ] Check Redis memory
  ```bash
  redis-cli INFO memory
  ```

- [ ] Review structured logs for anomalies
  ```bash
  kubectl logs deployment/thanawy-backend | grep "ERROR\|WARN"
  ```

### First 24 Hours
- [ ] Monitor for payment races (should be ZERO)
  ```sql
  -- Should return 0 (no duplicate enrollments)
  SELECT COUNT(*) FROM (
    SELECT "userId", "subjectId", COUNT(*) as cnt
    FROM "SubjectEnrollment"
    WHERE "createdAt" > NOW() - INTERVAL '24 hours'
    GROUP BY "userId", "subjectId"
  ) t WHERE cnt > 1;
  ```

- [ ] Check rate limit effectiveness
  - [ ] Verify spam/abuse attempts blocked
  - [ ] Check logs for 429 responses
  - [ ] Validate legitimate users still work

- [ ] Performance baseline
  - [ ] API response times
  - [ ] Database query times
  - [ ] AI response latency
  - [ ] Frontend load times

---

## Rollback Procedure (إذا حدثت مشكلة)

### If Database Issue
```bash
# Stop services
kubectl scale deployment/thanawy-backend --replicas=0

# Restore from backup
psql -h $DB_HOST -U $DB_USER $DB_NAME < backup_<timestamp>.sql

# Run old migration version
migrate -path backend/internal/db/migrations \
        -database "$DATABASE_URL" down -all

# Restart
kubectl scale deployment/thanawy-backend --replicas=3
```

### If Backend Issue
```bash
# Rollback to previous image
kubectl rollout undo deployment/thanawy-backend

# Verify
kubectl rollout status deployment/thanawy-backend
```

### If Configuration Issue
```bash
# Revert environment variables
kubectl set env deployment/thanawy-backend \
  DB_MAX_OPEN_CONNS=50 \
  DB_MAX_IDLE_CONNS=10
```

---

## Monitoring & Alerting

### Set Up Alerts
```yaml
# Example Prometheus alert rules
groups:
  - name: thanawy_production
    rules:
      - alert: HighDatabaseConnectionUsage
        expr: db_connection_pool_used / db_connection_pool_max > 0.9
        for: 5m
        annotations:
          summary: "Database connection pool at 90%"

      - alert: HighErrorRate
        expr: rate(http_requests_errors_total[5m]) > 0.01
        for: 5m
        annotations:
          summary: "Error rate > 1%"

      - alert: SlowDatabaseQueries
        expr: histogram_quantile(0.95, rate(db_query_duration[5m])) > 1000
        for: 5m
        annotations:
          summary: "Database p95 latency > 1s"

      - alert: RateLimitExceeded
        expr: rate(http_rate_limited_total[1m]) > 100
        for: 1m
        annotations:
          summary: "High rate limit violations"
```

### Key Metrics to Track
```
- db_connection_pool_used / db_connection_pool_max
- redis_memory_used_bytes
- http_request_duration_seconds (p50, p95, p99)
- http_requests_total (by endpoint)
- http_requests_errors_total (by code)
- payment_processing_duration_seconds
- payment_race_condition_detections
- rate_limit_rejections_total
```

---

## Communication Checklist

- [ ] Notify team of deployment time
- [ ] Inform support team about new rate limits
- [ ] Update status page
- [ ] Prepare incident response team
- [ ] Document new endpoints (/health, /live, /ready)

---

## Post-Deployment Success Criteria

✅ **All of the following must be TRUE:**

1. **Security**
   - [ ] No auth bypass exploits
   - [ ] JWT validation working
   - [ ] Rate limiting active

2. **Data Integrity**
   - [ ] Zero duplicate payments
   - [ ] Zero orphaned enrollments
   - [ ] All transactions atomic

3. **Performance**
   - [ ] API response time < 500ms (p95)
   - [ ] Database queries < 100ms (p95)
   - [ ] AI responses < 30s

4. **Reliability**
   - [ ] Health checks all "ok"
   - [ ] Error rate < 0.1%
   - [ ] No connection pool exhaustion

5. **Observability**
   - [ ] Request IDs in all logs
   - [ ] Trace IDs for distributed tracing
   - [ ] Structured logging working

---

## Emergency Contacts

- Backend Lead: [Name]
- DevOps Lead: [Name]
- Database DBA: [Name]
- On-Call Engineer: [Rotation]

---

## Sign-Off

- [ ] Backend Review: _________________ Date: _______
- [ ] DevOps Review: _________________ Date: _______
- [ ] QA Sign-Off: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______

---

## Notes & Observations

(Add deployment observations here)

```
Time Started: ________
Time Completed: ________
Total Duration: ________
Issues Encountered: ________
Resolution: ________
Post-Deployment Status: ✅ / ⚠️ / ❌
```
