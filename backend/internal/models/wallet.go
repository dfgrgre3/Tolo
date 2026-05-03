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
	ID          string          `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID      string          `gorm:"not null;index;type:uuid;column:user_id;constraint:OnDelete:CASCADE" json:"userId"`
	Type        TransactionType `gorm:"not null;index;column:type" json:"type"`
	Amount      float64         `gorm:"not null;column:amount" json:"amount"`
	Currency    string          `gorm:"not null;default:'EGP';column:currency" json:"currency"`
	WalletType  string          `gorm:"not null;default:'BALANCE';column:wallet_type" json:"walletType"`
	Description string          `gorm:"column:description" json:"description"`
	ReferenceID *string         `gorm:"index;type:uuid;column:reference_id" json:"referenceId"`
	CreatedAt   time.Time       `gorm:"index;column:created_at" json:"createdAt"`
	DeletedAt   gorm.DeletedAt  `gorm:"index;column:deleted_at" json:"-"`

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
