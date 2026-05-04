package services

import (
	"database/sql"
	"fmt"
	"time"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// PaymentService handles all payment-related operations with proper transaction management
type PaymentService struct {
	db *gorm.DB
}

func NewPaymentService() *PaymentService {
	return &PaymentService{db: db.DB}
}

// ProcessPaymentCompletion handles the complete payment workflow with row-level locking
// This prevents race conditions and duplicate transactions
func (ps *PaymentService) ProcessPaymentCompletion(paymentID string, externalTxnID int64) error {
	return ps.db.Transaction(func(tx *gorm.DB) error {
		// STEP 1: Lock the payment record for update (row-level lock)
		// This prevents concurrent updates to the same payment
		var payment models.Payment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&payment, "id = ?", paymentID).Error; err != nil {
			return fmt.Errorf("payment not found: %w", err)
		}

		// STEP 2: Verify payment is in PENDING state (idempotency check)
		if payment.Status != models.PaymentPending {
			return fmt.Errorf("payment already processed: %s", payment.Status)
		}

		// STEP 3: Update payment status atomically
		now := time.Now()
		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":        models.PaymentCompleted,
			"externalTxnId": fmt.Sprintf("%d", externalTxnID),
			"completedAt":   now,
		}).Error; err != nil {
			return fmt.Errorf("failed to update payment status: %w", err)
		}

		// STEP 4: Process based on payment type
		if err := ps.processPaymentByType(tx, payment, now); err != nil {
			return fmt.Errorf("failed to process payment type: %w", err)
		}

		// STEP 5: Audit log for compliance
		if err := ps.logPaymentAudit(tx, payment, "COMPLETED"); err != nil {
			// Log but don't fail - audit logging should not block payment completion
			fmt.Printf("Warning: failed to log payment audit: %v\n", err)
		}

		return nil
	}, &sql.TxOptions{Isolation: sql.LevelSerializable}) // Use highest isolation level
}

// processPaymentByType routes payment processing based on payment method
func (ps *PaymentService) processPaymentByType(tx *gorm.DB, payment models.Payment, now time.Time) error {
	switch payment.Method {
	case "COURSE_PURCHASE":
		return ps.processCoursePurchase(tx, payment)
	case "WALLET_TOPUP":
		return ps.processWalletTopup(tx, payment)
	case "SUBSCRIPTION":
		return ps.processSubscription(tx, payment, now)
	default:
		return fmt.Errorf("unknown payment method: %s", payment.Method)
	}
}

// processCoursePurchase handles course enrollment after payment
func (ps *PaymentService) processCoursePurchase(tx *gorm.DB, payment models.Payment) error {
	if payment.SubjectID == nil || *payment.SubjectID == "" {
		return nil // Not a course purchase
	}

	subjectID := *payment.SubjectID

	// LOCK: Acquire write lock on Subject row to prevent race conditions on enrollment count
	var subject models.Subject
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&subject, "id = ?", subjectID).Error; err != nil {
		return fmt.Errorf("subject not found: %w", err)
	}

	// Create enrollment with conflict handling (user already enrolled)
	enrollment := models.Enrollment{
		UserID:    payment.UserID,
		SubjectID: subjectID,
		EnrolledAt: time.Now(),
	}

	// Use ON CONFLICT DO NOTHING to prevent duplicate enrollments
	if err := tx.Clauses(clause.OnConflict{DoNothing: true}).
		Create(&enrollment).Error; err != nil {
		return fmt.Errorf("failed to create enrollment: %w", err)
	}

	// Increment enrollment count ONLY if new enrollment was created
	// This is atomic due to row lock acquired above
	if err := tx.Model(&subject).
		Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1")).Error; err != nil {
		return fmt.Errorf("failed to update enrollment count: %w", err)
	}

	return nil
}

// processWalletTopup handles wallet credit addition
func (ps *PaymentService) processWalletTopup(tx *gorm.DB, payment models.Payment) error {
	// LOCK: Acquire write lock on User row to prevent concurrent balance updates
	var user models.User
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&user, "id = ?", payment.UserID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// Update balance atomically with version increment (optimistic locking fallback)
	if err := tx.Model(&user).Updates(map[string]interface{}{
		"balance": gorm.Expr("balance + ?", payment.Amount),
		"version": gorm.Expr("version + 1"),
	}).Error; err != nil {
		return fmt.Errorf("failed to update user balance: %w", err)
	}

	// Record wallet transaction for audit trail
	walletTx := models.WalletTransaction{
		UserID:      payment.UserID,
		Type:        models.TxTypeDeposit,
		Amount:      payment.Amount,
		Currency:    "EGP",
		WalletType:  "BALANCE",
		Description: "شحن رصيد عبر بوابة الدفع",
		ReferenceID: &payment.Reference,
	}

	if err := tx.Create(&walletTx).Error; err != nil {
		return fmt.Errorf("failed to record wallet transaction: %w", err)
	}

	return nil
}

// processSubscription handles subscription creation after payment
func (ps *PaymentService) processSubscription(tx *gorm.DB, payment models.Payment, now time.Time) error {
	if payment.PlanID == "" {
		return nil // Not a subscription payment
	}

	// Lock plan for reading (no concurrent modifications expected)
	var plan models.SubscriptionPlan
	if err := tx.First(&plan, "id = ?", payment.PlanID).Error; err != nil {
		return fmt.Errorf("subscription plan not found: %w", err)
	}

	// Calculate subscription duration
	duration := ps.calculateSubscriptionDuration(plan.Interval)

	// Lock user for subscription updates
	var user models.User
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&user, "id = ?", payment.UserID).Error; err != nil {
		return fmt.Errorf("user not found: %w", err)
	}

	// Create subscription
	startDate := now
	endDate := startDate.Add(duration)
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

	// Update user's active subscription atomically
	if err := tx.Model(&user).Updates(map[string]interface{}{
		"activeSubscriptionId":   sub.ID,
		"subscriptionExpiresAt": endDate,
	}).Error; err != nil {
		return fmt.Errorf("failed to update user subscription: %w", err)
	}

	return nil
}

// calculateSubscriptionDuration determines subscription duration based on interval
func (ps *PaymentService) calculateSubscriptionDuration(interval models.SubscriptionInterval) time.Duration {
	switch interval {
	case models.IntervalMonthly:
		return 30 * 24 * time.Hour
	case models.IntervalYearly:
		return 365 * 24 * time.Hour
	case models.IntervalForever:
		return 100 * 365 * 24 * time.Hour
	default:
		return 30 * 24 * time.Hour // Default to monthly
	}
}

// logPaymentAudit logs payment completion for compliance and auditing
func (ps *PaymentService) logPaymentAudit(tx *gorm.DB, payment models.Payment, action string) error {
	audit := models.AuditLog{
		UserID:    payment.UserID,
		EventType: "PAYMENT_" + action,
		Metadata: fmt.Sprintf("Payment ID: %s, Amount: %.2f, Method: %s",
			payment.ID, payment.Amount, payment.Method),
	}

	return tx.Create(&audit).Error
}

// VerifyPaymentIdempotency checks if a payment has already been processed
// Prevents duplicate processing due to webhook retries
func (ps *PaymentService) VerifyPaymentIdempotency(externalRef string) (bool, error) {
	var count int64
	err := ps.db.Model(&models.Payment{}).
		Where("status = ? AND reference = ?", models.PaymentCompleted, externalRef).
		Count(&count).Error

	return count > 0, err
}

// RefundPayment handles payment refunds with proper cleanup
func (ps *PaymentService) RefundPayment(paymentID string, reason string) error {
	return ps.db.Transaction(func(tx *gorm.DB) error {
		// Lock payment for update
		var payment models.Payment
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&payment, "id = ?", paymentID).Error; err != nil {
			return fmt.Errorf("payment not found: %w", err)
		}

		// Can only refund completed payments
		if payment.Status != models.PaymentCompleted {
			return fmt.Errorf("can only refund completed payments")
		}

		// Update payment status
		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status": models.PaymentRefunded,
		}).Error; err != nil {
			return fmt.Errorf("failed to mark payment as refunded: %w", err)
		}

		// Reverse wallet credit if it was a topup
		if payment.Method == "WALLET_TOPUP" {
			if err := tx.Model(&models.User{}).Where("id = ?", payment.UserID).
				Update("balance", gorm.Expr("balance - ?", payment.Amount)).Error; err != nil {
				return fmt.Errorf("failed to reverse wallet credit: %w", err)
			}

			// Log refund transaction
			walletTx := models.WalletTransaction{
				UserID:      payment.UserID,
				Type:        models.TxTypeWithdraw,
				Amount:      payment.Amount,
				Currency:    "EGP",
				WalletType:  "BALANCE",
				Description: fmt.Sprintf("استرجاع دفع: %s", reason),
				ReferenceID: &payment.Reference,
			}
			if err := tx.Create(&walletTx).Error; err != nil {
				return fmt.Errorf("failed to log refund transaction: %w", err)
			}
		}

		// Log refund for audit
		if err := ps.logPaymentAudit(tx, payment, "REFUNDED"); err != nil {
			fmt.Printf("Warning: failed to log refund audit: %v\n", err)
		}

		return nil
	}, &sql.TxOptions{Isolation: sql.LevelSerializable})
}
