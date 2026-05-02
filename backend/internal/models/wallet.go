package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type TransactionType string

const (
	TxTypeDeposit   TransactionType = "DEPOSIT"
	TxTypeWithdraw  TransactionType = "WITHDRAW"
	TxTypeRefund    TransactionType = "REFUND"
	TxTypeAiUsage   TransactionType = "AI_USAGE"
	TxTypeExamUsage TransactionType = "EXAM_USAGE"
)

type WalletTransaction struct {
	ID          string          `gorm:"primaryKey;type:text" json:"id"`
	UserID      string          `gorm:"not null;index;type:text;constraint:OnDelete:CASCADE" json:"userId"`
	Type        TransactionType `gorm:"not null;index" json:"type"`
	Amount      float64         `gorm:"not null" json:"amount"`      // Positive or negative
	Currency    string          `gorm:"not null;default:'EGP'" json:"currency"`
	WalletType  string          `gorm:"not null;default:'BALANCE'" json:"walletType"` // BALANCE, AI_CREDITS, EXAM_CREDITS
	Description string          `json:"description"`
	ReferenceID *string         `gorm:"index;type:text" json:"referenceId"`    // e.g. PaymentID, ExamResultID, AIConversationID
	CreatedAt   time.Time       `gorm:"index" json:"createdAt"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`

	// Relations
	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (WalletTransaction) TableName() string {
	return "WalletTransaction"
}

func (w *WalletTransaction) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return
}
