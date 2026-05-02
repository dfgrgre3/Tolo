package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Coupon struct {
	ID             string     `gorm:"primaryKey" json:"id"`
	Code           string     `gorm:"uniqueIndex;not null" json:"code"`
	Description    string     `json:"description"`
	DiscountType   string     `gorm:"default:'PERCENTAGE'" json:"discountType"` // PERCENTAGE, FIXED
	DiscountValue  float64    `gorm:"not null" json:"discountValue"`
	MinOrderAmount float64    `gorm:"default:0" json:"minOrderAmount"`
	MaxUses        *int       `json:"maxUses"`
	UsedCount      int        `gorm:"default:0" json:"usedCount"`
	ExpiryDate     *time.Time `json:"expiryDate"`
	IsActive       bool       `gorm:"default:true" json:"isActive"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

type Automation struct {
	ID          string    `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"not null" json:"name"`
	Description string    `json:"description"`
	Event       string    `gorm:"not null" json:"event"`      // e.g., "user_signup", "exam_completed"
	Trigger     string    `json:"trigger"`                    // alias for event or more specific trigger
	Conditions  string    `gorm:"type:text" json:"conditions"` // JSON of conditions
	Actions     string    `gorm:"type:text" json:"actions"`    // JSON of actions to perform
	IsActive    bool      `gorm:"default:true" json:"isActive"`
	LastRunAt   *time.Time `json:"lastRunAt"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ABExperiment struct {
	ID          string     `gorm:"primaryKey" json:"id"`
	Name        string     `gorm:"not null" json:"name"`
	Description string     `json:"description"`
	Status      string     `gorm:"default:'DRAFT'" json:"status"` // DRAFT, ACTIVE, COMPLETED
	Variants    string     `gorm:"type:text" json:"variants"`    // JSON of variants and weights
	TrafficPct  int        `gorm:"default:100" json:"trafficPct"`
	StartDate   *time.Time `json:"startDate"`
	EndDate     *time.Time `json:"endDate"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}

func (Coupon) TableName() string { return "Coupon" }
func (c *Coupon) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" { c.ID = uuid.New().String() }
	return nil
}

func (Automation) TableName() string { return "Automation" }
func (a *Automation) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" { a.ID = uuid.New().String() }
	return nil
}

func (ABExperiment) TableName() string { return "ABExperiment" }
func (a *ABExperiment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" { a.ID = uuid.New().String() }
	return nil
}
