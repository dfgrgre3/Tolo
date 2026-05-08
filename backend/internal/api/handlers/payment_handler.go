package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const idQuery = "id = ?"
const authRequired = "Authentication required"

// Paymob Callback Handler
func PaymobWebhook(c *gin.Context) {
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	paymobSvc := services.NewPaymobService()
	if !paymobSvc.VerifyHMAC(payload) {
		fmt.Println("Paymob Webhook: HMAC verification failed")
		c.JSON(http.StatusForbidden, gin.H{"error": "Invalid signature"})
		return
	}

	data := extractPaymobTransactionData(payload)
	if data.Pending {
		return
	}

	var payment models.Payment
	if err := db.DB.Where("\"paymobOrderId\" = ?", data.OrderID).First(&payment).Error; err != nil {
		fmt.Printf("Payment record not found for Paymob Order: %d\n", data.OrderID)
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	if data.Success {
		handleSuccessfulPayment(c, &payment, data)
	} else {
		handleFailedPayment(&payment, data.OrderID)
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

type paymobTransactionData struct {
	Success bool
	Pending bool
	OrderID int64
	TxnID   int64
}

func extractPaymobTransactionData(payload map[string]interface{}) paymobTransactionData {
	obj, ok := payload["obj"].(map[string]interface{})
	if !ok {
		obj = payload
	}
	success, _ := obj["success"].(bool)
	pending, _ := obj["pending"].(bool)
	orderIDFloat, _ := obj["order"].(float64)
	txnIDFloat, _ := obj["id"].(float64)

	return paymobTransactionData{
		Success: success,
		Pending: pending,
		OrderID: int64(orderIDFloat),
		TxnID:   int64(txnIDFloat),
	}
}

func handleSuccessfulPayment(c *gin.Context, payment *models.Payment, data paymobTransactionData) {
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(payment).Updates(map[string]interface{}{
			"status":        models.PaymentCompleted,
			"externalTxnId": fmt.Sprintf("%d", data.TxnID),
			"completedAt":   time.Now(),
		}).Error; err != nil {
			return err
		}

		return processPaymentItems(tx, payment)
	})

	if err != nil {
		services.GetAuditService().LogAsync(payment.UserID, services.AuditEventPaymentFailed, "payment", payment.ID, map[string]interface{}{"error": err.Error(), "orderId": data.OrderID}, c.ClientIP(), c.Request.UserAgent())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update record"})
		return
	}

	services.GetAuditService().LogAsync(payment.UserID, services.AuditEventPaymentSuccess, "payment", payment.ID, map[string]interface{}{"amount": payment.Amount, "orderId": data.OrderID}, c.ClientIP(), c.Request.UserAgent())
}

func handleFailedPayment(payment *models.Payment, orderID int64) {
	db.DB.Model(payment).Update("status", models.PaymentFailed)
	services.GetAuditService().LogAsync(payment.UserID, services.AuditEventPaymentFailed, "payment", payment.ID, map[string]interface{}{"reason": "provider_failed", "orderId": orderID}, "", "")
}

func processPaymentItems(tx *gorm.DB, payment *models.Payment) error {
	if payment.SubjectID != nil && *payment.SubjectID != "" {
		if err := processSubjectEnrollment(tx, payment); err != nil {
			return err
		}
	}

	if payment.Method == "WALLET_TOPUP" {
		if err := processWalletTopup(tx, payment); err != nil {
			return err
		}
	}

	if payment.PlanID != "" {
		if err := processSubscriptionPayment(tx, payment); err != nil {
			return err
		}
	}

	return nil
}

func processSubjectEnrollment(tx *gorm.DB, payment *models.Payment) error {
	enrollment := models.Enrollment{
		UserID:     payment.UserID,
		SubjectID:  *payment.SubjectID,
		EnrolledAt: time.Now(),
	}
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment).Error; err != nil {
		return err
	}
	return tx.Model(&models.Subject{}).Where(idQuery, *payment.SubjectID).Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1")).Error
}

func processWalletTopup(tx *gorm.DB, payment *models.Payment) error {
	if err := tx.Model(&models.User{}).Where(idQuery, payment.UserID).
		Updates(map[string]interface{}{
			"balance": gorm.Expr("balance + ?", payment.Amount),
			"version": gorm.Expr("version + 1"),
		}).Error; err != nil {
		return err
	}

	walletTx := models.WalletTransaction{
		UserID:      payment.UserID,
		Type:        models.TxTypeDeposit,
		Amount:      payment.Amount,
		Currency:    "EGP",
		WalletType:  "BALANCE",
		Description: "شحن رصيد عبر بوابة الدفع",
		ReferenceID: &payment.Reference,
	}
	return tx.Create(&walletTx).Error
}

func processSubscriptionPayment(tx *gorm.DB, payment *models.Payment) error {
	var plan models.SubscriptionPlan
	if err := tx.First(&plan, idQuery, payment.PlanID).Error; err != nil {
		return fmt.Errorf("plan not found: %w", err)
	}

	duration := calculateSubscriptionDuration(plan.Interval)
	startDate := time.Now()
	endDate := startDate.Add(duration)

	sub := models.UserSubscription{
		UserID:               payment.UserID,
		PlanID:               plan.ID,
		Status:               models.SubscriptionActive,
		StartDate:            startDate,
		EndDate:              endDate,
		PaymobSubscriptionID: &payment.Reference,
	}
	if err := tx.Create(&sub).Error; err != nil {
		return fmt.Errorf("failed to create subscription: %w", err)
	}

	if err := tx.Model(&models.User{}).Where(idQuery, payment.UserID).Updates(map[string]interface{}{
		"activeSubscriptionId":  sub.ID,
		"subscriptionExpiresAt": endDate,
	}).Error; err != nil {
		return fmt.Errorf("failed to update user subscription: %w", err)
	}

	invoice := models.Invoice{
		PaymentID:     payment.ID,
		UserID:        payment.UserID,
		InvoiceNumber: "INV-" + time.Now().Format("20060102") + "-" + payment.ID[:8],
	}
	return tx.Create(&invoice).Error
}

func calculateSubscriptionDuration(interval models.SubscriptionInterval) time.Duration {
	switch interval {
	case models.IntervalYearly:
		return 365 * 24 * time.Hour
	case models.IntervalForever:
		return 100 * 365 * 24 * time.Hour
	default:
		return 30 * 24 * time.Hour
	}
}


type CreatePaymentRequest struct {
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	Method    string  `json:"method" binding:"required"`
	Currency  string  `json:"currency"`
	SubjectID *string `json:"subjectId"`
}

var allowedPaymentMethods = map[string]bool{
	"card":            true,
	"wallet":          true,
	"fawry":           true,
	"internal_wallet": true,
	"PAYMOB":          true,
	"WALLET":          true,
}

// generateSecureReference generates a cryptographically unique payment reference
func generateSecureReference(prefix string) string {
	b := make([]byte, 12)
	_, _ = rand.Read(b)
	return fmt.Sprintf("%s-%s-%s", prefix, time.Now().Format("20060102150405"), hex.EncodeToString(b))
}

func CreatePayment(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": authRequired})
		return
	}

	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Currency == "" {
		req.Currency = "EGP"
	}
	if !allowedPaymentMethods[req.Method] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported payment method"})
		return
	}

	// Validate amount bounds
	if req.Amount > 100000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount exceeds maximum allowed"})
		return
	}
	if req.SubjectID != nil && *req.SubjectID != "" {
		var subject models.Subject
		if err := db.DB.Select("id", "price").First(&subject, idQuery, *req.SubjectID).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid subject"})
			return
		}
		if subject.Price > 0 && req.Amount != subject.Price {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment amount"})
			return
		}
	}

	payment := models.Payment{
		UserID:    userId.(string),
		SubjectID: req.SubjectID,
		Amount:    req.Amount,
		Currency:  req.Currency,
		Method:    req.Method,
		Status:    models.PaymentPending,
		Reference: generateSecureReference("REF"),
	}

	if err := db.DB.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	services.GetAuditService().LogAsync(userId.(string), services.AuditEventPaymentStarted, "payment", payment.ID, map[string]interface{}{"amount": req.Amount, "method": req.Method}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusCreated, payment)
}

func GetPaymentHistory(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": authRequired})
		return
	}

	var payments []models.Payment

	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(100).Find(&payments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch payments"})
		return
	}

	c.JSON(http.StatusOK, payments)
}

func GetSubscriptionAddons(c *gin.Context) {
	addons := []gin.H{
		{
			"id":          "addon_ai_100",
			"name":        "100 AI Messages",
			"nameAr":      "100 رسالة ذكية إضافية",
			"description": "استمر في طرح الأسئلة على المساعد الذكي بكل حرية",
			"price":       50,
			"type":        "AI_CREDITS",
			"value":       100,
		},
		{
			"id":          "addon_exams_5",
			"name":        "5 Premium Exams",
			"nameAr":      "5 امتحانات متميزة إضافية",
			"description": "افتح الوصول إلى 5 امتحانات شاملة من اختيارك",
			"price":       75,
			"type":        "EXAM_PACK",
			"value":       5,
		},
		{
			"id":          "addon_balance_100",
			"name":        "100 EGP Wallet Balance",
			"nameAr":      "شحن 100 ج.م في المحفظة",
			"description": "أضف رصيداً لمحفظتك لاستخدامه لاحقاً في شراء الدورات",
			"price":       100,
			"type":        "WALLET_CREDIT",
			"value":       100,
	c.JSON(http.StatusOK, gin.H{"addons": addons})
}

// addonPrices maps addon IDs to their prices for server-side validation
var addonPrices = map[string]float64{
	"addon_ai_100":      50,
	"addon_exams_5":     75,
	"addon_balance_100": 100,
}

func PurchaseAddon(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": authRequired})
		return
	}

	var req struct {
		AddonID string `json:"addonId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	price, validAddon := addonPrices[req.AddonID]
	if !validAddon {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid addon ID"})
		return
	}

	paymentRef := generateSecureReference("ADDON")
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		user, err := getUserForPurchase(tx, userId.(string))
		if err != nil {
			return err
		}

		if user.Balance < price {
			return services.ErrInsufficientBalance
		}

		if err := deductUserBalance(tx, user, price); err != nil {
			return err
		}

		if err := applyAddonCredits(tx, userId.(string), req.AddonID); err != nil {
			return err
		}

		return createAddonRecords(tx, userId.(string), req.AddonID, price, paymentRef)
	})

	if err != nil {
		handlePurchaseError(c, err)
		return
	}

	services.GetAuditService().LogAsync(userId.(string), services.AuditEventAdminAction, "addon", req.AddonID, map[string]interface{}{"price": price}, c.ClientIP(), c.Request.UserAgent())
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func getUserForPurchase(tx *gorm.DB, userID string) (*models.User, error) {
	var user models.User
	if err := tx.Where(idQuery, userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func deductUserBalance(tx *gorm.DB, user *models.User, price float64) error {
	result := tx.Model(&models.User{}).
		Where("id = ? AND version = ?", user.ID, user.Version).
		Updates(map[string]interface{}{
			"balance": gorm.Expr("balance - ?", price),
			"version": user.Version + 1,
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return services.ErrOptimisticLock
	}
	return nil
}

func applyAddonCredits(tx *gorm.DB, userID string, addonID string) error {
	switch addonID {
	case "addon_ai_100":
		return tx.Model(&models.User{}).Where(idQuery, userID).
			Update("aiCredits", gorm.Expr("\"aiCredits\" + ?", 100)).Error
	case "addon_exams_5":
		return tx.Model(&models.User{}).Where(idQuery, userID).
			Update("examCredits", gorm.Expr("\"examCredits\" + ?", 5)).Error
	case "addon_balance_100":
		return tx.Model(&models.User{}).Where(idQuery, userID).
			Update("balance", gorm.Expr("balance + ?", 100)).Error
	default:
		return nil
	}
}

func createAddonRecords(tx *gorm.DB, userID string, addonID string, price float64, ref string) error {
	walletTx := models.WalletTransaction{
		UserID:      userID,
		Type:        models.TxTypeWithdraw,
		Amount:      -price,
		Currency:    "EGP",
		WalletType:  "BALANCE",
		Description: fmt.Sprintf("شراء إضافة: %s", addonID),
		ReferenceID: &ref,
	}
	if err := tx.Create(&walletTx).Error; err != nil {
		return err
	}

	payment := models.Payment{
		UserID:      userID,
		Amount:      price,
		Currency:    "EGP",
		Method:      "WALLET",
		Status:      models.PaymentCompleted,
		Reference:   ref,
		CompletedAt: time.Now(),
	}
	return tx.Create(&payment).Error
}

func handlePurchaseError(c *gin.Context, err error) {
	if err == services.ErrInsufficientBalance {
		c.JSON(http.StatusBadRequest, gin.H{"error": "رصيدك غير كافٍ لإتمام هذه العملية"})
		return
	}
	if err == services.ErrOptimisticLock {
		c.JSON(http.StatusConflict, gin.H{"error": "يرجى المحاولة مرة أخرى"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to apply addon credits"})
}

func HandleWalletDeposit(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": authRequired})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	// Use centralized wallet service with optimistic locking
	_, err := services.ProcessWalletTransaction(
		userId.(string),
		req.Amount,
		models.TxTypeDeposit,
		"BALANCE",
		"إيداع رصيد في المحفظة",
		nil,
	)

	if err != nil {
		if err == services.ErrOptimisticLock {
			c.JSON(http.StatusConflict, gin.H{"error": "يرجى المحاولة مرة أخرى"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update wallet"})
		return
	}

	// Create payment record for audit trail
	payment := models.Payment{
		UserID:      userId.(string),
		Amount:      req.Amount,
		Currency:    "EGP",
		Method:      "WALLET_TOPUP",
		Status:      models.PaymentCompleted,
		Reference:   generateSecureReference("TOPUP"),
		CompletedAt: time.Now(),
	}
	if err := db.DB.Create(&payment).Error; err != nil {
		// Log but don't fail — the deposit itself succeeded
		fmt.Printf("Warning: failed to create payment audit record for user %s: %v\n", userId, err)
	} else {
		services.GetAuditService().LogAsync(userId.(string), services.AuditEventPaymentSuccess, "wallet_topup", payment.ID, map[string]interface{}{"amount": req.Amount}, c.ClientIP(), c.Request.UserAgent())
	}

	// Reload user for fresh balance
	var user models.User
	db.DB.First(&user, idQuery, userId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"balance": user.Balance,
		"message": "تم شحن الرصيد بنجاح",
	})
}
