package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type SubscriptionInterval string

const (
	IntervalMonthly SubscriptionInterval = "MONTHLY"
	IntervalYearly  SubscriptionInterval = "YEARLY"
	IntervalForever SubscriptionInterval = "FOREVER"
)

type SubscriptionStatus string

const (
	SubscriptionActive    SubscriptionStatus = "ACTIVE"
	SubscriptionCancelled SubscriptionStatus = "CANCELLED"
	SubscriptionExpired   SubscriptionStatus = "EXPIRED"
	SubscriptionPending   SubscriptionStatus = "PENDING"
)

type SubscriptionPlan struct {
	ID          string               `gorm:"primaryKey;type:text" json:"id"`
	Name        string               `gorm:"not null;uniqueIndex" json:"name"`
	NameAr      string               `gorm:"not null" json:"nameAr"`
	Description string               `json:"description"`
	Price       float64              `gorm:"not null;default:0" json:"price"`
	Currency    string               `gorm:"not null;default:'EGP'" json:"currency"`
	Interval    SubscriptionInterval `gorm:"not null;default:'MONTHLY'" json:"interval"`
	IsActive    bool                 `gorm:"default:true;index" json:"isActive"`
	
	// Features stored as JSON for flexibility
	Features    JSONStringArray      `gorm:"type:jsonb" json:"features"`
	
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   time.Time            `json:"updatedAt"`
}

type UserSubscription struct {
	ID          string             `gorm:"primaryKey;type:text" json:"id"`
	UserID      string             `gorm:"not null;index;type:text" json:"userId"`
	PlanID      string             `gorm:"not null;index;type:text" json:"planId"`
	Status      SubscriptionStatus `gorm:"not null;default:'PENDING';index" json:"status"`
	
	StartDate   time.Time          `gorm:"not null" json:"startDate"`
	EndDate     time.Time          `gorm:"not null;index" json:"endDate"`
	
	AutoRenew   bool               `gorm:"default:true" json:"autoRenew"`
	
	// Paymob specific
	PaymobSubscriptionID *string   `gorm:"index" json:"paymobSubscriptionId"`
	
	CreatedAt   time.Time          `json:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt"`

	// Relations
	User User             `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Plan SubscriptionPlan `gorm:"foreignKey:PlanID" json:"plan"`
}

func (SubscriptionPlan) TableName() string {
	return "SubscriptionPlan"
}

func (sp *SubscriptionPlan) BeforeCreate(tx *gorm.DB) (err error) {
	if sp.ID == "" {
		sp.ID = uuid.New().String()
	}
	return
}

func (UserSubscription) TableName() string {
	return "UserSubscription"
}

func (us *UserSubscription) BeforeCreate(tx *gorm.DB) (err error) {
	if us.ID == "" {
		us.ID = uuid.New().String()
	}
	return
}
