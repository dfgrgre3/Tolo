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
	ID          string               `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string               `gorm:"not null;uniqueIndex;column:name" json:"name"`
	NameAr      string               `gorm:"not null;column:name_ar" json:"nameAr"`
	Description string               `gorm:"column:description" json:"description"`
	Price       float64              `gorm:"not null;default:0;column:price" json:"price"`
	Currency    string               `gorm:"not null;default:'EGP';column:currency" json:"currency"`
	Interval    SubscriptionInterval `gorm:"not null;default:'MONTHLY';column:interval" json:"interval"`
	IsActive    bool                 `gorm:"default:true;index;column:is_active" json:"isActive"`
	
	Features    JSONStringArray      `gorm:"type:jsonb;column:features" json:"features"`
	
	CreatedAt   time.Time            `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time            `gorm:"column:updated_at" json:"updatedAt"`
}

type UserSubscription struct {
	ID          string             `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID      string             `gorm:"not null;index;type:uuid;column:user_id" json:"userId"`
	PlanID      string             `gorm:"not null;index;type:uuid;column:plan_id" json:"planId"`
	Status      SubscriptionStatus `gorm:"not null;default:'PENDING';index;column:status" json:"status"`
	
	StartDate   time.Time          `gorm:"not null;column:start_date" json:"startDate"`
	EndDate     time.Time          `gorm:"not null;index;column:end_date" json:"endDate"`
	
	AutoRenew   bool               `gorm:"default:true;column:auto_renew" json:"autoRenew"`
	
	PaymobSubscriptionID *string   `gorm:"index;column:paymob_subscription_id" json:"paymobSubscriptionId"`
	
	CreatedAt   time.Time          `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time          `gorm:"column:updated_at" json:"updatedAt"`

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
