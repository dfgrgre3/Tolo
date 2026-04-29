package models

import (
	"time"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type PaymentStatus string

const (
	PaymentPending   PaymentStatus = "PENDING"
	PaymentCompleted PaymentStatus = "COMPLETED"
	PaymentFailed    PaymentStatus = "FAILED"
)

type Payment struct {
	ID        string        `gorm:"primaryKey" json:"id"`
	UserID    string        `gorm:"not null;index" json:"userId"`
	SubjectID string        `gorm:"index" json:"subjectId"`
	Amount    float64       `gorm:"not null" json:"amount"`
	Currency  string        `gorm:"default:'EGP'" json:"currency"`
	Status    PaymentStatus `gorm:"default:'PENDING'" json:"status"`
	Method    string        `json:"method"` // PAYMOB, WALLET, etc.
	Reference string        `gorm:"uniqueIndex" json:"reference"`
	CreatedAt time.Time     `json:"createdAt"`
	UpdatedAt time.Time     `json:"updatedAt"`

	// Relations
	Subject   Subject       `gorm:"foreignKey:SubjectID" json:"subject,omitempty"`
}

type Invoice struct {
	ID            string    `gorm:"primaryKey" json:"id"`
	PaymentID     string    `gorm:"uniqueIndex" json:"paymentId"`
	UserID        string    `gorm:"index" json:"userId"`
	InvoiceNumber string    `gorm:"uniqueIndex" json:"invoiceNumber"`
	PdfUrl        string    `json:"pdfUrl"`
	CreatedAt     time.Time `json:"createdAt"`
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

