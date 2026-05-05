package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Coupon struct {
	ID             string     `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Code           string     `gorm:"uniqueIndex;not null;column:code" json:"code"`
	Description    string     `gorm:"column:description" json:"description"`
	DiscountType   string     `gorm:"default:'PERCENTAGE';column:discount_type" json:"discountType"`
	DiscountValue  float64    `gorm:"not null;column:discount_value" json:"discountValue"`
	MinOrderAmount float64    `gorm:"default:0;column:min_order_amount" json:"minOrderAmount"`
	MaxUses        *int       `gorm:"column:max_uses" json:"maxUses"`
	UsedCount      int        `gorm:"default:0;column:used_count" json:"usedCount"`
	ExpiryDate     *time.Time `gorm:"column:expiry_date" json:"expiryDate"`
	IsActive       bool       `gorm:"default:true;column:is_active" json:"isActive"`
	CreatedAt      time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt      time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

type Automation struct {
	ID          string     `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string     `gorm:"not null;column:name" json:"name"`
	Description string     `gorm:"column:description" json:"description"`
	Event       string     `gorm:"not null;column:event" json:"event"`
	Trigger     string     `gorm:"column:trigger" json:"trigger"`
	Conditions  string     `gorm:"type:text;column:conditions" json:"conditions"`
	Actions     string     `gorm:"type:text;column:actions" json:"actions"`
	IsActive    bool       `gorm:"default:true;column:is_active" json:"isActive"`
	LastRunAt   *time.Time `gorm:"column:last_run_at" json:"lastRunAt"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

type ABExperiment struct {
	ID          string     `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string     `gorm:"not null;column:name" json:"name"`
	Description string     `gorm:"column:description" json:"description"`
	Status      string     `gorm:"default:'DRAFT';column:status" json:"status"`
	Variants    string     `gorm:"type:text;column:variants" json:"variants"`
	TrafficPct  int        `gorm:"default:100;column:traffic_pct" json:"trafficPct"`
	StartDate   *time.Time `gorm:"column:start_date" json:"startDate"`
	EndDate     *time.Time `gorm:"column:end_date" json:"endDate"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

// Campaign represents a marketing campaign
type Campaign struct {
	ID          string     `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Name        string     `gorm:"not null;column:name" json:"name"`
	Description string     `gorm:"column:description" json:"description"`
	Type        string     `gorm:"default:'email';column:type" json:"type"`
	Status      string     `gorm:"default:'DRAFT';column:status" json:"status"`
	TargetRole  string     `gorm:"column:target_role" json:"targetRole"`
	Content     string     `gorm:"type:text;column:content" json:"content"`
	StartDate   *time.Time `gorm:"column:start_date" json:"startDate"`
	EndDate     *time.Time `gorm:"column:end_date" json:"endDate"`
	SentCount   int        `gorm:"default:0;column:sent_count" json:"sentCount"`
	OpenCount   int        `gorm:"default:0;column:open_count" json:"openCount"`
	ClickCount  int        `gorm:"default:0;column:click_count" json:"clickCount"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

// ContentReport represents a content moderation report
type ContentReport struct {
	ID           string     `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	ReporterID   string     `gorm:"index;type:uuid;column:reporter_id" json:"reporterId"`
	Reporter     *User      `gorm:"foreignKey:ReporterID;constraint:OnDelete:SET NULL" json:"reporter,omitempty"`
	ContentType  string     `gorm:"not null;column:content_type" json:"contentType"`
	ContentID    string     `gorm:"index;not null;column:content_id" json:"contentId"`
	ContentTitle string     `gorm:"column:content_title" json:"contentTitle"`
	Reason       string     `gorm:"not null;column:reason" json:"reason"`
	Description  string     `gorm:"type:text;column:description" json:"description"`
	Status       string     `gorm:"default:'PENDING';column:status" json:"status"`
	ResolvedBy   *string    `gorm:"type:uuid;column:resolved_by" json:"resolvedBy"`
	ResolvedAt   *time.Time `gorm:"column:resolved_at" json:"resolvedAt"`
	CreatedAt    time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

func (Coupon) TableName() string { return "Coupon" }
func (c *Coupon) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (Automation) TableName() string { return "Automation" }
func (a *Automation) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

func (ABExperiment) TableName() string { return "ABExperiment" }
func (a *ABExperiment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

func (Campaign) TableName() string { return "Campaign" }
func (c *Campaign) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (ContentReport) TableName() string { return "ContentReport" }
func (cr *ContentReport) BeforeCreate(tx *gorm.DB) error {
	if cr.ID == "" {
		cr.ID = uuid.New().String()
	}
	return nil
}
