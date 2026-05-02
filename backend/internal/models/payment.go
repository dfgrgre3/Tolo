package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "PENDING"
	PaymentCompleted PaymentStatus = "COMPLETED"
	PaymentFailed    PaymentStatus = "FAILED"
	PaymentRefunded  PaymentStatus = "REFUNDED"
)

type Payment struct {
	ID        string        `gorm:"primaryKey;type:text" json:"id"`
	UserID    string        `gorm:"not null;index:idx_payment_user_subject,priority:1;type:text" json:"userId"`
	SubjectID string        `gorm:"index:idx_payment_user_subject,priority:2;type:text" json:"subjectId"`
	PlanID    string        `gorm:"index;type:text" json:"planId"`
	Amount    float64       `gorm:"not null;check:amount >= 0" json:"amount"`
	Currency  string        `gorm:"not null;default:'EGP'" json:"currency"`
	Status    PaymentStatus `gorm:"not null;default:'PENDING';index" json:"status"`
	Method    string        `gorm:"not null" json:"method"` // PAYMOB, WALLET, etc.
	Reference string        `gorm:"uniqueIndex;not null" json:"reference"`
	
	// Paymob specific fields
	PaymobOrderID int64     `gorm:"index" json:"paymobOrderId"`
	ExternalTxnID string    `gorm:"index" json:"externalTxnId"`
	CompletedAt   time.Time `json:"completedAt"`

	CreatedAt time.Time     `gorm:"index" json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`

	// Relations
	User    User    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Subject Subject `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

type Invoice struct {
	ID            string    `gorm:"primaryKey;type:text" json:"id"`
	PaymentID     string    `gorm:"uniqueIndex;not null;type:text" json:"paymentId"`
	UserID        string    `gorm:"index;not null;type:text" json:"userId"`
	InvoiceNumber string    `gorm:"uniqueIndex;not null" json:"invoiceNumber"`
	PdfUrl        string    `json:"pdfUrl"`
	CreatedAt     time.Time `json:"createdAt"`

	// Relations
	Payment Payment `gorm:"foreignKey:PaymentID;constraint:OnDelete:CASCADE" json:"payment,omitempty"`
	User    User    `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (Payment) TableName() string {
	return "Payment"
}

func (p *Payment) BeforeCreate(tx *gorm.DB) (err error) {
	if p.ID == "" {
		p.ID = uuid.New().String()
	}
	return
}

func (Invoice) TableName() string {
	return "Invoice"
}

func (i *Invoice) BeforeCreate(tx *gorm.DB) (err error) {
	if i.ID == "" {
		i.ID = uuid.New().String()
	}
	return
}
