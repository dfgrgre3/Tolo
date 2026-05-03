# 🔗 Integration Guide - How to Apply the Fixes

## نظرة عامة
هذا الملف يشرح كيفية دمج كل الإصلاحات الحرجة في كودك الحالي.

---

## 1️⃣ JWT Authentication + Context Middleware

### الملفات المُنشأة:
- ✅ `backend/internal/middleware/jwt_context.go` (جديد)
- ✅ `backend/internal/middleware/correlation.go` (جديد)
- ✅ تحديث `backend/internal/api/grpc/analytics_service.go`

### التطبيق في main.go:

```go
// في cmd/api/main.go
package main

import (
    "thanawy-backend/internal/middleware"
    "thanawy-backend/internal/logger"
)

func setupRoutes(router *gin.Engine) {
    // 🔐 Add authentication middleware FIRST
    router.Use(middleware.CorrelationMiddleware())    // Add request/trace IDs
    router.Use(logger.RequestLogger())                // Structured logging
    
    // Public routes (no auth)
    public := router.Group("/api/public")
    {
        public.POST("/auth/register", handlers.Register)
        public.POST("/auth/login", handlers.Login)
        public.GET("/health", handlers.HealthCheck)
        public.GET("/live", handlers.LivenessCheck)
        public.GET("/ready", handlers.ReadinessCheck)
    }
    
    // Protected routes (require JWT)
    protected := router.Group("/api")
    protected.Use(middleware.JWTAuthMiddleware())  // 🔒 Add after public
    {
        protected.GET("/user/profile", handlers.GetProfile)
        protected.GET("/analytics", handlers.GetProgressSummary)
        // ... other protected routes
    }
    
    // Admin routes (require Admin role)
    admin := router.Group("/api/admin")
    admin.Use(middleware.JWTAuthMiddleware())
    admin.Use(middleware.RequireRole(models.RoleAdmin))
    {
        admin.GET("/users", handlers.ListUsers)
        admin.POST("/features", handlers.CreateFeature)
        // ... admin routes
    }
}

func main() {
    // ... existing code ...
    
    router := gin.Default()
    setupRoutes(router)
    
    router.Run(":8080")
}
```

---

## 2️⃣ Payment Service with Race Condition Fixes

### الملفات المُنشأة:
- ✅ `backend/internal/services/payment_service.go` (جديد - محسّن)

### استبدال payment_handler.go:

```go
// في backend/internal/api/handlers/payment_handler.go
// استبدل PaymobWebhook function بهذا:

func PaymobWebhook(c *gin.Context) {
    var payload map[string]interface{}
    if err := c.ShouldBindJSON(&payload); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
        return
    }

    // Extract data from Paymob webhook
    obj, ok := payload["obj"].(map[string]interface{})
    if !ok {
        obj = payload
    }

    success, _ := obj["success"].(bool)
    pending, _ := obj["pending"].(bool)
    orderIDFloat, _ := obj["order"].(float64)
    orderID := int64(orderIDFloat)
    txnIDFloat, _ := obj["id"].(float64)
    txnID := int64(txnIDFloat)

    // Verify HMAC
    paymobSvc := services.NewPaymobService()
    if !paymobSvc.VerifyHMAC(payload) {
        logger.Warn("Paymob HMAC verification failed", map[string]interface{}{
            "order_id": orderID,
        })
        c.JSON(http.StatusForbidden, gin.H{"error": "Invalid signature"})
        return
    }

    if pending {
        c.JSON(http.StatusOK, gin.H{"status": "pending"})
        return
    }

    // Find payment record
    var payment models.Payment
    if err := db.DB.Where("\"paymobOrderId\" = ?", orderID).First(&payment).Error; err != nil {
        logger.Error("Payment not found", err, map[string]interface{}{
            "paymob_order_id": orderID,
        })
        c.JSON(http.StatusOK, gin.H{"status": "ignored"})
        return
    }

    if success {
        // 🔐 Use new payment service with proper locking
        paymentSvc := services.NewPaymentService()
        if err := paymentSvc.ProcessPaymentCompletion(payment.ID, txnID); err != nil {
            logger.Error("Payment processing failed", err, map[string]interface{}{
                "payment_id": payment.ID,
                "amount":     payment.Amount,
            })
            c.JSON(http.StatusOK, gin.H{"status": "error"})  // Still 200 for Paymob
            return
        }

        logger.Info("Payment processed successfully", map[string]interface{}{
            "payment_id": payment.ID,
            "amount":     payment.Amount,
            "user_id":    payment.UserID,
        })
        c.JSON(http.StatusOK, gin.H{"status": "success"})
    } else {
        // Mark as failed
        if err := db.DB.Model(&payment).Update("status", models.PaymentFailed).Error; err != nil {
            logger.Error("Failed to update payment status", err, nil)
        }
        c.JSON(http.StatusOK, gin.H{"status": "failed"})
    }
}
```

---

## 3️⃣ Rate Limiting Middleware

### الملفات المُنشأة:
- ✅ `backend/internal/middleware/rate_limiter.go` (جديد)

### التطبيق في main.go:

```go
// في cmd/api/main.go
import (
    "time"
    "thanawy-backend/internal/middleware"
    "github.com/redis/go-redis/v9"
)

func setupRoutes(router *gin.Engine, redisClient *redis.Client) {
    limiter := middleware.NewRateLimiter(redisClient)
    
    // 🚦 Apply rate limiting to sensitive endpoints
    
    // Auth endpoints - strict
    auth := router.Group("/api/auth")
    auth.Use(limiter.RateLimitByIP(5, time.Minute))  // 5 login attempts per minute per IP
    {
        auth.POST("/login", handlers.Login)
        auth.POST("/register", handlers.Register)
        auth.POST("/forgot-password", handlers.ForgotPassword)
    }
    
    // AI endpoints - moderate
    ai := router.Group("/api/ai")
    ai.Use(middleware.JWTAuthMiddleware())
    ai.Use(limiter.RateLimitByUser(100, 24*time.Hour))     // 100 per day
    ai.Use(limiter.RateLimitByEndpoint("ai_chat", 10, time.Minute)) // 10 per minute
    {
        ai.POST("/chat", handlers.AIChatProxy)
    }
    
    // Payment endpoints - strict
    payment := router.Group("/api/payment")
    payment.Use(middleware.JWTAuthMiddleware())
    payment.Use(limiter.RateLimitByUser(5, time.Hour))  // 5 payments per hour
    {
        payment.POST("/initiate", handlers.InitiatePayment)
    }
    
    // Admin endpoints
    admin := router.Group("/api/admin")
    admin.Use(middleware.JWTAuthMiddleware())
    admin.Use(middleware.RequireRole(models.RoleAdmin))
    admin.Use(limiter.RateLimitByUser(1000, time.Hour))  // Generous for admins
    {
        admin.POST("/users", handlers.CreateUser)
        admin.DELETE("/users/:id", handlers.DeleteUser)
    }
}

func main() {
    // ... existing code ...
    
    // Initialize Redis client for rate limiting
    redisClient := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_URL"),
    })
    
    router := gin.Default()
    setupRoutes(router, redisClient)
    router.Run(":8080")
}
```

---

## 4️⃣ Structured Logging

### الملفات المُنشأة:
- ✅ `backend/internal/logger/structured_logger.go` (جديد)

### التطبيق في handlers:

```go
// في أي handler
import "thanawy-backend/internal/logger"

func ProcessPayment(c *gin.Context) {
    // Get user ID from context (set by JWT middleware)
    userID, err := middleware.GetUserIDFromContext(c)
    if err != nil {
        logger.Error("Unauthorized payment attempt", err, map[string]interface{}{
            "ip": c.ClientIP(),
        })
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    // Log business event
    logger.Info("Payment initiated", map[string]interface{}{
        "user_id": userID,
        "amount":  req.Amount,
        "method":  req.Method,
    })

    // Process payment
    result, err := paymentService.Process(req)
    if err != nil {
        logger.Error("Payment processing failed", err, map[string]interface{}{
            "user_id": userID,
            "amount":  req.Amount,
        })
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Payment failed"})
        return
    }

    logger.Info("Payment completed", map[string]interface{}{
        "user_id":   userID,
        "amount":    req.Amount,
        "reference": result.Reference,
    })

    c.JSON(http.StatusOK, result)
}
```

---

## 5️⃣ Database Connection Pooling

### تحديث في db.go:

```go
// في backend/internal/db/db.go - مُحدّث بالفعل
// فقط تأكد من استخدام القيم الجديدة:

maxIdleConns := 20       // من 10 → 20
maxOpenConns := 200      // من 50 → 200
connMaxLifetime := 5 * time.Minute    // من 60 دقيقة → 5 دقائق
connMaxIdleTime := 2 * time.Minute    // من 30 دقيقة → 2 دقائق

// تحديث .env:
DB_MAX_OPEN_CONNS=200
DB_MAX_IDLE_CONNS=20
DB_CONN_MAX_LIFETIME_MINUTES=5
DB_CONN_MAX_IDLE_MINUTES=2
```

---

## 6️⃣ Health Checks

### الملفات المُنشأة:
- ✅ `backend/internal/api/handlers/health_check_handler.go` (جديد)

### التطبيق في main.go:

```go
// في setupRoutes function
health := router.Group("/")
{
    health.GET("/health", handlers.HealthCheck)      // Comprehensive checks
    health.GET("/live", handlers.LivenessCheck)      // K8s liveness
    health.GET("/ready", handlers.ReadinessCheck)    // K8s readiness
}
```

### Kubernetes deployment update:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thanawy-backend
spec:
  template:
    spec:
      containers:
      - name: backend
        livenessProbe:
          httpGet:
            path: /live
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 3
          
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 2
```

---

## 7️⃣ Database Migrations

### تطبيق Safe Deletes:

```bash
# تشغيل migration
cd backend
migrate -path internal/db/migrations \
        -database "postgresql://user:pass@localhost/thanawy" \
        up

# تحقق من النتيجة
psql -c "SELECT EXISTS (SELECT 1 FROM \"DeletedRecordArchive\" LIMIT 1);"
```

---

## ✅ Integration Checklist

```bash
# 1. Add new middleware files
cp backend/internal/middleware/jwt_context.go <your-project>/backend/internal/middleware/
cp backend/internal/middleware/correlation.go <your-project>/backend/internal/middleware/
cp backend/internal/middleware/rate_limiter.go <your-project>/backend/internal/middleware/

# 2. Add new service file
cp backend/internal/services/payment_service.go <your-project>/backend/internal/services/

# 3. Add logger
cp backend/internal/logger/structured_logger.go <your-project>/backend/internal/logger/

# 4. Add health checks
cp backend/internal/api/handlers/health_check_handler.go <your-project>/backend/internal/api/handlers/

# 5. Add migration
cp backend/internal/db/migrations/0006_safe_deletes.sql <your-project>/backend/internal/db/migrations/

# 6. Update imports in handlers
# - Add: import "thanawy-backend/internal/middleware"
# - Add: import "thanawy-backend/internal/logger"
# - Add: import "thanawy-backend/internal/services"

# 7. Test locally
cd <your-project>
go mod tidy
go build ./cmd/api/main.go

# 8. Run tests
go test ./...

# 9. Start service
./main
curl http://localhost:8080/health
```

---

## 🔍 Quick Verification

### Test Auth Middleware
```bash
# Without token
curl http://localhost:8080/api/protected
# Expected: 401 Unauthorized

# With invalid token
curl -H "Authorization: Bearer invalid" http://localhost:8080/api/protected
# Expected: 401 Unauthorized

# With valid token
TOKEN=$(curl -X POST http://localhost:8080/api/auth/login -d '{"email":"user@example.com","password":"password"}' | jq -r '.token')
curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/protected
# Expected: 200 OK
```

### Test Rate Limiting
```bash
# Make 15 requests in rapid succession
for i in {1..15}; do
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/ai/chat &
done
wait

# Check logs for 429 Too Many Requests
kubectl logs deployment/thanawy-backend | grep 429
```

### Test Health Checks
```bash
curl http://localhost:8080/health | jq .
# Expected: { "status": "ok", "checks": {...} }

curl http://localhost:8080/live | jq .
# Expected: { "status": "alive" }

curl http://localhost:8080/ready | jq .
# Expected: { "status": "ready" }
```

---

## 🐛 Troubleshooting

### Import Errors
```bash
# If you get import errors, run:
go mod tidy
go get -u all

# Verify all imports are available:
grep -r "thanawy-backend/internal" backend/internal/ | head -5
```

### Redis Connection Issues
```bash
# Verify Redis is running
redis-cli ping
# Expected: PONG

# Test rate limiter
redis-cli INFO stats
```

### Database Connection Issues
```bash
# Test database
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pool
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

---

## 📞 Next Steps

1. **Deploy to staging** → Test all flows
2. **Load test** → Verify at 1K+ concurrent users
3. **Production rollout** → Follow deployment checklist
4. **Monitor metrics** → Health, latency, error rates

---

**Ready to integrate? Start with Step 1 (JWT Middleware)!**
