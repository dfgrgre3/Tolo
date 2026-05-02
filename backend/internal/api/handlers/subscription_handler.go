package handlers

import (
	"fmt"
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetSubscriptionPlans(c *gin.Context) {
	var plans []models.SubscriptionPlan
	if err := db.DB.Where("\"isActive\" = ?", true).Order("price asc").Find(&plans).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch plans"})
		return
	}
	c.JSON(http.StatusOK, plans)
}

func GetUserSubscription(c *gin.Context) {
	userId, _ := c.Get("userId")
	
	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.ActiveSubscriptionID == nil {
		c.JSON(http.StatusOK, gin.H{"active": false})
		return
	}

	var sub models.UserSubscription
	if err := db.DB.Preload("Plan").First(&sub, "id = ?", *user.ActiveSubscriptionID).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"active": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"active": true,
		"subscription": sub,
	})
}

// PurchasePlan handles purchasing a subscription plan using wallet balance
func PurchasePlan(c *gin.Context) {
	userId, _ := c.Get("userId")
	
	var req struct {
		PlanID string `json:"planId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var plan models.SubscriptionPlan
	if err := db.DB.First(&plan, "id = ?", req.PlanID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.Balance < plan.Price {
		c.JSON(http.StatusBadRequest, gin.H{"error": "رصيدك غير كافٍ لإتمام هذه العملية"})
		return
	}

	// Calculate duration
	duration := 30 * 24 * time.Hour
	if plan.Interval == models.IntervalYearly {
		duration = 365 * 24 * time.Hour
	} else if plan.Interval == models.IntervalForever {
		duration = 100 * 365 * 24 * time.Hour
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// Deduct balance
		if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", plan.Price)).Error; err != nil {
			return err
		}

		// Create user subscription
		startDate := time.Now()
		endDate := startDate.Add(duration)

		sub := models.UserSubscription{
			UserID:    user.ID,
			PlanID:    plan.ID,
			Status:    models.SubscriptionActive,
			StartDate: startDate,
			EndDate:   endDate,
		}

		if err := tx.Create(&sub).Error; err != nil {
			return err
		}

		// Update user active subscription
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"activeSubscriptionId":   sub.ID,
			"subscriptionExpiresAt": endDate,
		}).Error; err != nil {
			return err
		}

		// Create payment record
		payment := models.Payment{
			UserID:    user.ID,
			PlanID:    plan.ID,
			Amount:    plan.Price,
			Currency:  plan.Currency,
			Method:    "WALLET",
			Status:    models.PaymentCompleted,
			Reference: generateSecureReference("PLAN"),
			CompletedAt: time.Now(),
		}
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		// Create invoice
		invoice := models.Invoice{
			PaymentID:     payment.ID,
			UserID:        user.ID,
			InvoiceNumber: "INV-" + time.Now().Format("20060102") + "-" + payment.ID[:8],
		}
		if err := tx.Create(&invoice).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete purchase"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// InitiatePlanPayment initiates a Paymob payment for a subscription plan
func InitiatePlanPayment(c *gin.Context) {
	userId, _ := c.Get("userId")

	var req struct {
		PlanID        string `json:"planId" binding:"required"`
		PaymentMethod string `json:"paymentMethod" binding:"required"` // "card", "wallet", "fawry"
		PhoneNumber   string `json:"phoneNumber"` // Required for wallet payments
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var plan models.SubscriptionPlan
	if err := db.DB.First(&plan, "id = ?", req.PlanID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get Paymob service
	paymob := services.NewPaymobService()

	// Authenticate with Paymob
	authToken, err := paymob.Authenticate()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to authenticate with payment provider"})
		return
	}

	// Calculate amount in cents (Paymob uses cents)
	amountCents := int64(plan.Price * 100)

	// Register order with Paymob
	orderID, err := paymob.RegisterOrder(authToken, amountCents, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to register order"})
		return
	}

	// Determine integration ID based on payment method
	var integrationID string
	switch req.PaymentMethod {
	case "card":
		integrationID = paymob.CardIntegrationID
	case "wallet":
		integrationID = paymob.WalletIntegrationID
	case "fawry":
		integrationID = paymob.FawryIntegrationID
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid payment method"})
		return
	}

	// Prepare billing data
	firstName := "User"
	if user.Name != nil && *user.Name != "" {
		firstName = *user.Name
	}
	phone := ""
	if user.Phone != nil {
		phone = *user.Phone
	}
	billingData := map[string]string{
		"first_name":   firstName,
		"last_name":    "User",
		"email":        user.Email,
		"phone_number": phone,
	}

	// Get payment key
	paymentKey, err := paymob.GetPaymentKey(authToken, orderID, amountCents, integrationID, billingData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate payment key"})
		return
	}

	// Create payment record in pending state
	payment := models.Payment{
		UserID:       user.ID,
		PlanID:       plan.ID,
		Amount:       plan.Price,
		Currency:     plan.Currency,
		Method:       "PAYMOB_" + req.PaymentMethod,
		Status:       models.PaymentPending,
		Reference:    generateSecureReference("PLAN"),
		PaymobOrderID: orderID,
	}
	if err := db.DB.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment record"})
		return
	}

	// For wallet payments, create wallet request
	if req.PaymentMethod == "wallet" && req.PhoneNumber != "" {
		redirectURL, err := paymob.CreateWalletRequest(paymentKey, req.PhoneNumber)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create wallet request"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"paymentKey":  paymentKey,
			"redirectUrl": redirectURL,
			"paymentId":   payment.ID,
			"orderId":     orderID,
		})
		return
	}

	// For card payments, return iframe URL
	iframeURL := fmt.Sprintf("https://accept.paymob.com/api/acceptance/iframes/%s?payment_token=%s", paymob.IframeID, paymentKey)
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"paymentKey": paymentKey,
		"iframeUrl":  iframeURL,
		"paymentId":  payment.ID,
		"orderId":    orderID,
	})
}

// CancelSubscription cancels the user's active subscription
func CancelSubscription(c *gin.Context) {
	userId, _ := c.Get("userId")

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.ActiveSubscriptionID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No active subscription to cancel"})
		return
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// Update subscription status to cancelled
		if err := tx.Model(&models.UserSubscription{}).
			Where("id = ?", *user.ActiveSubscriptionID).
			Update("status", models.SubscriptionCancelled).Error; err != nil {
			return err
		}

		// Clear user's active subscription
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"activeSubscriptionId":   nil,
			"subscriptionExpiresAt": nil,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cancel subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription cancelled successfully"})
}

// RenewSubscription renews an expired or cancelled subscription
func RenewSubscription(c *gin.Context) {
	userId, _ := c.Get("userId")

	var req struct {
		PlanID string `json:"planId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var plan models.SubscriptionPlan
	if err := db.DB.First(&plan, "id = ?", req.PlanID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Plan not found"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
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

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		// Create new subscription
		sub := models.UserSubscription{
			UserID:    user.ID,
			PlanID:    plan.ID,
			Status:    models.SubscriptionActive,
			StartDate: startDate,
			EndDate:   endDate,
		}

		if err := tx.Create(&sub).Error; err != nil {
			return err
		}

		// Update user's active subscription
		if err := tx.Model(&user).Updates(map[string]interface{}{
			"activeSubscriptionId":   sub.ID,
			"subscriptionExpiresAt": endDate,
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to renew subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Subscription renewed successfully"})
}
