package models

import (
	"time"

	"gorm.io/gorm"
)

// UserJourney represents a complete user session journey
type UserJourney struct {
	ID             string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID         string         `gorm:"type:uuid;not null;index" json:"userId"`
	SessionID      string         `gorm:"size:100;not null;index" json:"sessionId"`
	StartedAt      time.Time      `gorm:"not null;index" json:"startedAt"`
	EndedAt        *time.Time     `json:"endedAt,omitempty"`
	TotalDuration  int64          `json:"totalDuration"` // in milliseconds
	ConversionGoal string         `gorm:"size:100" json:"conversionGoal,omitempty"`
	Completed      bool           `gorm:"default:false" json:"completed"`
	DeviceInfo     string         `gorm:"size:500" json:"deviceInfo,omitempty"`
	IPAddress      string         `gorm:"size:50" json:"ipAddress,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User  User              `gorm:"foreignKey:UserID" json:"-"`
	Steps []UserJourneyStep `gorm:"foreignKey:JourneyID;references:ID" json:"steps,omitempty"`
}

// UserJourneyStep represents a single step/action in a user journey
type UserJourneyStep struct {
	ID        string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	JourneyID string         `gorm:"type:uuid;not null;index" json:"journeyId"`
	UserID    string         `gorm:"type:uuid;not null;index" json:"userId"`
	SessionID string         `gorm:"size:100;not null" json:"sessionId"`
	Page      string         `gorm:"size:500;not null" json:"page"`   // URL path
	Action    string         `gorm:"size:100;not null" json:"action"` // page_view, click, scroll, etc.
	Metadata  JSONMap        `gorm:"type:jsonb" json:"metadata,omitempty"`
	Timestamp time.Time      `gorm:"not null;index" json:"timestamp"`
	Duration  *int64         `json:"duration,omitempty"` // time spent on this step in ms
	CreatedAt time.Time      `json:"createdAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	Journey UserJourney `gorm:"foreignKey:JourneyID" json:"-"`
}

// ConversionEvent represents a user completing a conversion goal
type ConversionEvent struct {
	ID           string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID       string         `gorm:"type:uuid;not null;index" json:"userId"`
	SessionID    string         `gorm:"size:100;not null;index" json:"sessionId"`
	JourneyID    *string        `gorm:"type:uuid" json:"journeyId,omitempty"`
	Goal         string         `gorm:"size:100;not null" json:"goal"` // signup, purchase, exam_complete, etc.
	Value        float64        `json:"value,omitempty"`               // monetary value or score
	Currency     string         `gorm:"size:3" json:"currency,omitempty"`
	Timestamp    time.Time      `gorm:"not null;index" json:"timestamp"`
	JourneySteps int            `json:"journeySteps"`                     // number of steps before conversion
	Source       string         `gorm:"size:100" json:"source,omitempty"` // organic, referral, campaign, etc.
	CampaignID   *string        `gorm:"type:uuid" json:"campaignId,omitempty"`
	Metadata     JSONMap        `gorm:"type:jsonb" json:"metadata,omitempty"`
	IPAddress    string         `gorm:"size:50" json:"ipAddress,omitempty"`
	CreatedAt    time.Time      `json:"createdAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User    User        `gorm:"foreignKey:UserID" json:"-"`
	Journey UserJourney `gorm:"foreignKey:JourneyID" json:"-"`
}

// PageView aggregates page view statistics
type PageView struct {
	ID             string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Page           string         `gorm:"size:500;not null;uniqueIndex:idx_page_date" json:"page"`
	Date           time.Time      `gorm:"type:date;not null;uniqueIndex:idx_page_date" json:"date"`
	Views          int64          `gorm:"default:0" json:"views"`
	UniqueVisitors int64          `gorm:"default:0" json:"uniqueVisitors"`
	AvgDuration    float64        `json:"avgDuration"`
	Bounces        int64          `gorm:"default:0" json:"bounces"`
	Exits          int64          `gorm:"default:0" json:"exits"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserFlow aggregates user flow statistics (page transitions)
type UserFlow struct {
	ID        string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	FromPage  string         `gorm:"size:500;not null;uniqueIndex:idx_flow" json:"fromPage"`
	ToPage    string         `gorm:"size:500;not null;uniqueIndex:idx_flow" json:"toPage"`
	Date      time.Time      `gorm:"type:date;not null;uniqueIndex:idx_flow" json:"date"`
	Count     int64          `gorm:"default:0" json:"count"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ActiveUserStats tracks daily/weekly/monthly active users
type ActiveUserStats struct {
	ID                 string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Date               time.Time `gorm:"type:date;not null;uniqueIndex" json:"date"`
	DailyActive        int64     `gorm:"default:0" json:"dailyActive"`
	WeeklyActive       int64     `gorm:"default:0" json:"weeklyActive"`
	MonthlyActive      int64     `gorm:"default:0" json:"monthlyActive"`
	NewUsers           int64     `gorm:"default:0" json:"newUsers"`
	ReturningUsers     int64     `gorm:"default:0" json:"returningUsers"`
	AvgSessionDuration float64   `json:"avgSessionDuration"`
	TotalSessions      int64     `gorm:"default:0" json:"totalSessions"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// TableName returns the table name for UserJourney
func (UserJourney) TableName() string {
	return "user_journeys"
}

// TableName returns the table name for UserJourneyStep
func (UserJourneyStep) TableName() string {
	return "user_journey_steps"
}

// TableName returns the table name for ConversionEvent
func (ConversionEvent) TableName() string {
	return "conversion_events"
}

// TableName returns the table name for PageView
func (PageView) TableName() string {
	return "page_views"
}

// TableName returns the table name for UserFlow
func (UserFlow) TableName() string {
	return "user_flows"
}

// TableName returns the table name for ActiveUserStats
func (ActiveUserStats) TableName() string {
	return "active_user_stats"
}
