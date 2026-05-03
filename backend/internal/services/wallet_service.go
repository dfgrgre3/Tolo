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

// ProcessWalletTransaction safely adds or deducts from a user's wallet using DB transactions and optimistic locking
// Implements retry logic for optimistic lock failures (max 3 retries)
func ProcessWalletTransaction(
	userID string,
	amount float64,
	transactionType models.TransactionType,
	walletType string,
	description string,
	referenceID *string,
) (*models.WalletTransaction, error) {
	var transactionRecord *models.WalletTransaction
	maxRetries := 3

	var err error
	for attempt := 0; attempt < maxRetries; attempt++ {
		err = db.DB.Transaction(func(tx *gorm.DB) error {
			// 1. Fetch user to check current balance and version
			var user models.User
			if err := tx.Where("id = ?", userID).First(&user).Error; err != nil {
				return err
			}

			currentVersion := user.Version

			// 2. Validate sufficient balance for withdrawals/usage
			if amount < 0 {
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
			}

			// 3. Create the wallet transaction record
			transactionRecord = &models.WalletTransaction{
				UserID:      userID,
				Type:        transactionType,
				Amount:      amount,
				Currency:    "EGP",
				WalletType:  walletType,
				Description: description,
				ReferenceID: referenceID,
			}

			if err := tx.Create(transactionRecord).Error; err != nil {
				return err
			}

			// 4. Update the User balance with Optimistic Locking
			updates := map[string]interface{}{
				"version": currentVersion + 1,
			}

			switch walletType {
			case "BALANCE":
				updates["balance"] = gorm.Expr("balance + ?", amount)
			case "AI_CREDITS":
				updates["aiCredits"] = gorm.Expr("\"aiCredits\" + ?", int(amount))
			case "EXAM_CREDITS":
				updates["examCredits"] = gorm.Expr("\"examCredits\" + ?", int(amount))
			}

			// Execute update where version matches
			result := tx.Model(&models.User{}).
				Where("id = ? AND version = ?", userID, currentVersion).
				Updates(updates)

			if result.Error != nil {
				return result.Error
			}

			if result.RowsAffected == 0 {
				// Another process updated the user balance in the meantime! Rollback.
				return ErrOptimisticLock
			}

			return nil
		})

		if err == nil {
			// Success
			return transactionRecord, nil
		}

		if err != ErrOptimisticLock {
			// Non-retryable error
			return nil, err
		}

		// Optimistic lock failed, retry after a small backoff
		if attempt < maxRetries-1 {
			time.Sleep(time.Duration(attempt+1) * 50 * time.Millisecond)
		}
	}

	return nil, err
}

// GetUserWalletTransactions retrieves transaction history
func GetUserWalletTransactions(userID string, limit int, offset int) ([]models.WalletTransaction, int64, error) {
	var transactions []models.WalletTransaction
	var total int64

	query := db.DB.Model(&models.WalletTransaction{}).Where("\"userId\" = ?", userID)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("\"createdAt\" desc").Limit(limit).Offset(offset).Find(&transactions).Error; err != nil {
		return nil, 0, err
	}

	return transactions, total, nil
}
