package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type CreatePaymentRequest struct {
	Amount    float64 `json:"amount" binding:"required,gt=0"`
	Method    string  `json:"method" binding:"required"`
	Currency  string  `json:"currency"`
	SubjectID string  `json:"subjectId"`
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

	// Validate amount bounds
	if req.Amount > 100000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Amount exceeds maximum allowed"})
		return
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
