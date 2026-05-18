package models

import "time"

// AnalyticsEvent stores raw analytics events ingested from the frontend.
// Used for Event-Driven Analytics — written by the batch worker (Redis Stream consumer),
// queried by analytics dashboards and aggregated into materialized views.
type AnalyticsEvent struct {
	ID          string     `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	EventID     string     `gorm:"uniqueIndex;not null;column:event_id" json:"eventId"`
	EventType   string     `gorm:"not null;index;column:event_type" json:"eventType"`
	UserID      *string    `gorm:"index;column:user_id" json:"userId"`
	Payload     JSONMap    `gorm:"type:jsonb;not null;default:'{}'" json:"payload"`
	Source      string     `gorm:"default:'frontend';column:source" json:"source"`
	IPAddress   *string    `gorm:"column:ip_address" json:"ipAddress"`
	UserAgent   *string    `gorm:"column:user_agent" json:"userAgent"`
	ReceivedAt  time.Time  `gorm:"not null;index;column:received_at" json:"receivedAt"`
	ProcessedAt *time.Time `gorm:"index;column:processed_at" json:"processedAt"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
}

func (AnalyticsEvent) TableName() string {
	return "AnalyticsEvent"
}
