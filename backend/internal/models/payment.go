package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "pending"
	PaymentCompleted PaymentStatus = "completed"
	PaymentFailed    PaymentStatus = "failed"
	PaymentRefunded  PaymentStatus = "refunded"
	PaymentCancelled PaymentStatus = "cancelled"
)

type Payment struct {
	ID        string        `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID    string        `gorm:"not null;index:idx_payment_user_subject,priority:1;type:uuid;column:user_id" json:"userId"`
	SubjectID *string       `gorm:"index:idx_payment_user_subject,priority:2;type:uuid;column:subject_id" json:"subjectId"`
	PlanID    string        `gorm:"index;type:uuid;column:plan_id" json:"planId"`
	Amount    float64       `gorm:"not null;check:amount >= 0;column:amount" json:"amount"`
	Currency  string        `gorm:"not null;default:'EGP';column:currency" json:"currency"`
	Status    PaymentStatus `gorm:"not null;default:'pending';index;column:status" json:"status"`
	Method    string        `gorm:"not null;column:method" json:"method"` // PAYMOB, WALLET, etc.
	Reference string        `gorm:"uniqueIndex;not null;column:reference" json:"reference"`

	// Paymob specific fields
	PaymobOrderID int64     `gorm:"index;column:paymob_order_id" json:"paymobOrderId"`
	ExternalTxnID string    `gorm:"index;column:external_txn_id" json:"externalTxnId"`
	CompletedAt   time.Time `gorm:"column:completed_at" json:"completedAt"`

	CreatedAt time.Time      `gorm:"index;column:created_at" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

	// Relations
	User    User     `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Subject *Subject `gorm:"foreignKey:SubjectID;constraint:OnDelete:SET NULL" json:"subject,omitempty"`
}

type Invoice struct {
	ID            string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	PaymentID     string         `gorm:"uniqueIndex;not null;type:uuid;column:payment_id" json:"paymentId"`
	UserID        string         `gorm:"index;not null;type:uuid;column:user_id" json:"userId"`
	InvoiceNumber string         `gorm:"uniqueIndex;not null;column:invoice_number" json:"invoiceNumber"`
	PdfUrl        string         `gorm:"column:pdf_url" json:"pdfUrl"`
	CreatedAt     time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`

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
