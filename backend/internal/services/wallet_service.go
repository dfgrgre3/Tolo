package services

import (
	"errors"
	"time"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"gorm.io/gorm"
)

var (
	ErrInsufficientBalance = errors.New("insufficient balance")
	ErrOptimisticLock      = errors.New("balance update collision, please try again")
)

// ProcessWalletTransaction safely adds or deducts from a user's wallet using DB transactions and optimistic locking.
// Implements retry logic for optimistic lock failures (max 3 retries).
func ProcessWalletTransaction(
	userID string,
	amount float64,
	transactionType models.TransactionType,
	walletType string,
	description string,
	referenceID *string,
) (*models.WalletTransaction, error) {
	var record *models.WalletTransaction

	err := withOptimisticRetry(3, func() error {
		return db.DB.Transaction(func(tx *gorm.DB) error {
			rec, txErr := executeWalletTransaction(tx, userID, amount, transactionType, walletType, description, referenceID)
			if txErr != nil {
				return txErr
			}
			record = rec
			return nil
		})
	})

	if err != nil {
		return nil, err
	}
	return record, nil
}

// withOptimisticRetry retries fn up to maxRetries times when it returns ErrOptimisticLock.
func withOptimisticRetry(maxRetries int, fn func() error) error {
	var err error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if err = fn(); err == nil {
			return nil
		}
		if err != ErrOptimisticLock {
			return err
		}
		if attempt < maxRetries-1 {
			time.Sleep(time.Duration(attempt+1) * 50 * time.Millisecond)
		}
	}
	return err
}

// executeWalletTransaction performs the core wallet transaction within an existing DB transaction.
func executeWalletTransaction(
	tx *gorm.DB,
	userID string,
	amount float64,
	transactionType models.TransactionType,
	walletType string,
	description string,
	referenceID *string,
) (*models.WalletTransaction, error) {
	// 1. Fetch user to check current balance and version
	var user models.User
	if err := tx.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}

	// 2. Validate sufficient balance for withdrawals/usage
	if err := validateBalance(user, amount, walletType); err != nil {
		return nil, err
	}

	// 3. Create the wallet transaction record
	record := &models.WalletTransaction{
		UserID:      userID,
		Type:        transactionType,
		Amount:      amount,
		Currency:    "EGP",
		WalletType:  walletType,
		Description: description,
		ReferenceID: referenceID,
	}
	if err := tx.Create(record).Error; err != nil {
		return nil, err
	}

	// 4. Update the User balance with Optimistic Locking
	if err := applyBalanceUpdate(tx, userID, user.Version, amount, walletType); err != nil {
		return nil, err
	}

	return record, nil
}

// validateBalance checks that the user has sufficient funds for a withdrawal.
func validateBalance(user models.User, amount float64, walletType string) error {
	if amount >= 0 {
		return nil
	}
	switch walletType {
	case "BALANCE":
		if user.Balance+amount < 0 {
			return ErrInsufficientBalance
		}
	case "AI_CREDITS":
		if float64(user.AiCredits)+amount < 0 {
			return ErrInsufficientBalance
		}
	case "EXAM_CREDITS":
		if float64(user.ExamCredits)+amount < 0 {
			return ErrInsufficientBalance
		}
	}
	return nil
}

// applyBalanceUpdate atomically updates the user's balance using optimistic locking.
func applyBalanceUpdate(tx *gorm.DB, userID string, currentVersion int, amount float64, walletType string) error {
	updates := map[string]interface{}{
		"version": currentVersion + 1,
	}

	switch walletType {
	case "BALANCE":
		updates["balance"] = gorm.Expr("balance + ?", amount)
	case "AI_CREDITS":
		updates["ai_credits"] = gorm.Expr("ai_credits + ?", int(amount))
	case "EXAM_CREDITS":
		updates["exam_credits"] = gorm.Expr("exam_credits + ?", int(amount))
	}

	result := tx.Model(&models.User{}).
		Where("id = ? AND version = ?", userID, currentVersion).
		Updates(updates)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrOptimisticLock
	}
	return nil
}

// GetUserWalletTransactions retrieves transaction history
func GetUserWalletTransactions(userID string, limit int, offset int) ([]models.WalletTransaction, int64, error) {
	var transactions []models.WalletTransaction
	var total int64

	query := db.DB.Model(&models.WalletTransaction{}).Where("user_id = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("created_at desc").Limit(limit).Offset(offset).Find(&transactions).Error; err != nil {
		return nil, 0, err
	}

	return transactions, total, nil
}
