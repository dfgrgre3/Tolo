package handlers

import (
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"
	"fmt"
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Paymob Callback Handler
func PaymobWebhook(c *gin.Context) {
	// Paymob sends transaction data in a nested object "obj" or directly depending on the version
	// We handle the transaction processed callback
	var payload map[string]interface{}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payload"})
		return
	}

	obj, ok := payload["obj"].(map[string]interface{})
	if !ok {
		// Try root if "obj" is missing
		obj = payload
	}

	success, _ := obj["success"].(bool)
	pending, _ := obj["pending"].(bool)
	orderIDFloat, _ := obj["order"].(float64)
	orderID := int64(orderIDFloat)
	txnIDFloat, _ := obj["id"].(float64)
	txnID := int64(txnIDFloat)

	// In a real app, verify HMAC here using services.NewPaymobService().HMACSecret

	if pending {
		// Payment is still processing (e.g. Fawry)
		return
	}

	// Find the payment record associated with this order ID
	// We need to store the Paymob Order ID in our database record
	var payment models.Payment
	if err := db.DB.Where("\"paymobOrderId\" = ?", orderID).First(&payment).Error; err != nil {
		// Log error but return 200 to Paymob
		fmt.Printf("Payment record not found for Paymob Order: %d\n", orderID)
		c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		return
	}

	if success {
		// Mark payment as completed
		err := db.DB.Transaction(func(tx *gorm.DB) error {
			if err := tx.Model(&payment).Updates(map[string]interface{}{
				"status":           models.PaymentCompleted,
				"externalTxnId":   fmt.Sprintf("%d", txnID),
				"completedAt":      time.Now(),
			}).Error; err != nil {
				return err
			}

			// If it's a course payment, auto-enroll
			if payment.SubjectID != "" {
				enrollment := models.Enrollment{
					UserID:    payment.UserID,
					SubjectID: payment.SubjectID,
					EnrolledAt: time.Now(),
				}
				if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment).Error; err != nil {
					return err
				}
				// Increment enrollment count
				tx.Model(&models.Subject{}).Where("id = ?", payment.SubjectID).Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1"))
			}

			// If it's a wallet top-up, add to balance
			if payment.Method == "WALLET_TOPUP" {
				tx.Model(&models.User{}).Where("id = ?", payment.UserID).Update("balance", gorm.Expr("balance + ?", payment.Amount))
			}

			// If it's a subscription plan payment, create user subscription
			if payment.PlanID != "" {
				var plan models.SubscriptionPlan
				if err := tx.First(&plan, "id = ?", payment.PlanID).Error; err != nil {
					return fmt.Errorf("plan not found: %w", err)
				}

				// Calculate duration
				duration := 30 * 24 * time.Hour
				if plan.Interval == models.IntervalYearly {
					duration = 365 * 24 * time.Hour
				} else if plan.Interval == models.IntervalForever {
					duration = 100 * 365 * 24 * time.Hour
				}

				startDate := time.Now()
				endDate := startDate.Add(duration)

				// Create user subscription
				sub := models.UserSubscription{
					UserID:    payment.UserID,
					PlanID:    plan.ID,
					Status:    models.SubscriptionActive,
					StartDate: startDate,
					EndDate:   endDate,
					PaymobSubscriptionID: &payment.Reference,
				}
				if err := tx.Create(&sub).Error; err != nil {
					return fmt.Errorf("failed to create subscription: %w", err)
				}

				// Update user's active subscription
				if err := tx.Model(&models.User{}).Where("id = ?", payment.UserID).Updates(map[string]interface{}{
					"activeSubscriptionId":   sub.ID,
					"subscriptionExpiresAt": endDate,
				}).Error; err != nil {
					return fmt.Errorf("failed to update user subscription: %w", err)
				}

				// Create invoice
				invoice := models.Invoice{
					PaymentID:     payment.ID,
					UserID:        payment.UserID,
					InvoiceNumber: "INV-" + time.Now().Format("20060102") + "-" + payment.ID[:8],
				}
				if err := tx.Create(&invoice).Error; err != nil {
					return fmt.Errorf("failed to create invoice: %w", err)
				}
			}

			return nil
		})

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update record"})
			return
		}
	} else {
		// Mark payment as failed
		db.DB.Model(&payment).Update("status", models.PaymentFailed)
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

type CreatePaymentRequest struct {
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	Method    string  `json:"method" binding:"required"`
	Currency  string  `json:"currency"`
	SubjectID string  `json:"subjectId"`
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
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
	if req.SubjectID != "" {
		var subject models.Subject
		if err := db.DB.Select("id", "price").First(&subject, "id = ?", req.SubjectID).Error; err != nil {
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

	c.JSON(http.StatusCreated, payment)
}

func GetPaymentHistory(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
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
		},
	}
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		AddonID string `json:"addonId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate addon exists
	price, validAddon := addonPrices[req.AddonID]
	if !validAddon {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid addon ID"})
		return
	}

	// Use a transaction with row-level locking to prevent race conditions
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		// SELECT ... FOR UPDATE prevents concurrent balance modifications
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&user, "id = ?", userId).Error; err != nil {
			return fmt.Errorf("user not found")
		}

		if user.Balance < price {
			return fmt.Errorf("insufficient_balance")
		}

		// Deduct balance using atomic SQL expression to prevent TOCTOU
		if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", price)).Error; err != nil {
			return fmt.Errorf("failed to update balance: %w", err)
		}

		// Add credits using atomic SQL expressions
		switch req.AddonID {
		case "addon_ai_100":
			if err := tx.Model(&user).Update("aiCredits", gorm.Expr("\"aiCredits\" + ?", 100)).Error; err != nil {
				return fmt.Errorf("failed to update credits: %w", err)
			}
		case "addon_exams_5":
			if err := tx.Model(&user).Update("examCredits", gorm.Expr("\"examCredits\" + ?", 5)).Error; err != nil {
				return fmt.Errorf("failed to update credits: %w", err)
			}
		case "addon_balance_100":
			// For wallet credit purchase, the net effect is balance stays the same
			// (deducted price, added value). Using external payment in real implementation.
			if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", 100)).Error; err != nil {
				return fmt.Errorf("failed to update balance: %w", err)
			}
		}

		// Create a payment record for audit trail
		payment := models.Payment{
			UserID:    user.ID,
			Amount:    price,
			Currency:  "EGP",
			Method:    "WALLET",
			Status:    models.PaymentCompleted,
			Reference: generateSecureReference("ADDON"),
		}
		if err := tx.Create(&payment).Error; err != nil {
			return fmt.Errorf("failed to create payment record: %w", err)
		}

		return nil
	})

	if err != nil {
		if err.Error() == "insufficient_balance" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "رصيدك غير كافٍ لإتمام هذه العملية"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func HandleWalletDeposit(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists || userId == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
		return
	}

	var req struct {
		Amount float64 `json:"amount" binding:"required,gt=0"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid amount"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// Update balance
		if err := tx.Model(&user).Update("balance", gorm.Expr("balance + ?", req.Amount)).Error; err != nil {
			return err
		}

		// Create payment record
		payment := models.Payment{
			UserID:    userId.(string),
			Amount:    req.Amount,
			Currency:  "EGP",
			Method:    "WALLET_TOPUP",
			Status:    models.PaymentCompleted,
			Reference: generateSecureReference("TOPUP"),
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update wallet"})
		return
	}

	// Reload user for fresh balance
	db.DB.First(&user, "id = ?", userId)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"balance": user.Balance,
		"message": "تم شحن الرصيد بنجاح",
	})
}
