package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// ScheduledItem represents an item scheduled for future execution
type ScheduledItem struct {
	ID           string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Type         string         `gorm:"size:20;not null" json:"type"` // announcement, exam, task, post, content
	Title        string         `gorm:"size:200;not null" json:"title"`
	Description  string         `gorm:"type:text" json:"description,omitempty"`
	Content      JSONMap        `gorm:"type:jsonb" json:"content"`
	ScheduledFor time.Time      `gorm:"not null;index" json:"scheduledFor"`
	Timezone     string         `gorm:"size:50;default:'UTC'" json:"timezone"`
	Frequency    string         `gorm:"size:20;default:'once'" json:"frequency"` // once, daily, weekly, monthly
	Status       string         `gorm:"size:20;default:'pending'" json:"status"` // pending, processing, completed, failed, cancelled
	RetryCount   int            `gorm:"default:0" json:"retryCount"`
	MaxRetries   int            `gorm:"default:3" json:"maxRetries"`
	Error        string         `gorm:"type:text" json:"error,omitempty"`
	ExecutedAt   *time.Time     `json:"executedAt,omitempty"`
	CancelledAt  *time.Time     `json:"cancelledAt,omitempty"`
	CreatedBy    string         `gorm:"type:uuid;not null" json:"createdBy"`
	CreatedAt    time.Time      `json:"createdAt"`
	UpdatedAt    time.Time      `json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}

// CustomReport represents a user-defined custom report
type CustomReport struct {
	ID                string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name              string          `gorm:"size:100;not null" json:"name"`
	Description       string          `gorm:"type:text" json:"description,omitempty"`
	Widgets           json.RawMessage `gorm:"type:jsonb" json:"widgets"`
	Filters           json.RawMessage `gorm:"type:jsonb" json:"filters,omitempty"`
	DateRangeFrom     *time.Time      `json:"dateRangeFrom,omitempty"`
	DateRangeTo       *time.Time      `json:"dateRangeTo,omitempty"`
	CreatedBy         string          `gorm:"type:uuid;not null" json:"createdBy"`
	CreatedAt         time.Time       `json:"createdAt"`
	UpdatedAt         time.Time       `json:"updatedAt"`
	DeletedAt         gorm.DeletedAt  `gorm:"index" json:"-"`
	IsPublic          bool            `gorm:"default:false" json:"isPublic"`
	LastRunAt         *time.Time      `json:"lastRunAt,omitempty"`
	ScheduleFrequency string          `gorm:"size:20" json:"scheduleFrequency,omitempty"`
	ScheduleEmailTo   []string        `gorm:"type:text[]" json:"scheduleEmailTo,omitempty"`
}

// SupportTicket represents a customer support ticket
type SupportTicket struct {
	ID                 string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TicketNumber       string         `gorm:"size:20;not null;uniqueIndex" json:"ticketNumber"`
	UserID             string         `gorm:"type:uuid;not null;index" json:"userId"`
	UserName           string         `gorm:"size:200" json:"userName"`
	UserEmail          string         `gorm:"size:255" json:"userEmail"`
	Subject            string         `gorm:"size:200;not null" json:"subject"`
	Description        string         `gorm:"type:text;not null" json:"description"`
	Category           string         `gorm:"size:20;not null" json:"category"`         // technical, billing, content, account, other
	Status             string         `gorm:"size:20;default:'open'" json:"status"`     // open, in_progress, resolved, closed, escalated
	Priority           string         `gorm:"size:10;default:'medium'" json:"priority"` // low, medium, high, urgent
	AssignedTo         *string        `gorm:"type:uuid" json:"assignedTo,omitempty"`
	AssignedToName     *string        `gorm:"size:200" json:"assignedToName,omitempty"`
	Tags               []string       `gorm:"type:text[]" json:"tags,omitempty"`
	RelatedEntityType  string         `gorm:"size:50" json:"relatedEntityType,omitempty"`
	RelatedEntityID    string         `gorm:"type:uuid" json:"relatedEntityId,omitempty"`
	CreatedAt          time.Time      `json:"createdAt"`
	UpdatedAt          time.Time      `json:"updatedAt"`
	ResolvedAt         *time.Time     `json:"resolvedAt,omitempty"`
	ClosedAt           *time.Time     `json:"closedAt,omitempty"`
	SatisfactionRating *int           `json:"satisfactionRating,omitempty"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User     User            `gorm:"foreignKey:UserID" json:"-"`
	Messages []TicketMessage `gorm:"foreignKey:TicketID" json:"messages,omitempty"`
}

// TicketMessage represents a message on a support ticket
type TicketMessage struct {
	ID          string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TicketID    string         `gorm:"type:uuid;not null;index" json:"ticketId"`
	SenderID    string         `gorm:"type:uuid;not null" json:"senderId"`
	SenderName  string         `gorm:"size:200;not null" json:"senderName"`
	SenderRole  string         `gorm:"size:20;not null" json:"senderRole"` // admin, user, system
	Message     string         `gorm:"type:text;not null" json:"message"`
	Attachments JSONMap        `gorm:"type:jsonb" json:"attachments,omitempty"`
	IsInternal  bool           `gorm:"default:false" json:"isInternal"`
	CreatedAt   time.Time      `json:"createdAt"`
	ReadAt      *time.Time     `json:"readAt,omitempty"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// Backup represents a system backup
type Backup struct {
	ID               string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name             string         `gorm:"size:100;not null" json:"name"`
	Type             string         `gorm:"size:20;not null" json:"type"`            // full, database, files, incremental
	Size             int64          `json:"size"`                                    // in bytes
	Status           string         `gorm:"size:20;default:'pending'" json:"status"` // pending, in_progress, completed, failed, restoring
	Checksum         string         `gorm:"size:64" json:"checksum,omitempty"`
	DownloadURL      string         `gorm:"size:500" json:"downloadUrl,omitempty"`
	IncludesFiles    bool           `gorm:"default:false" json:"includesFiles"`
	IncludesDatabase bool           `gorm:"default:false" json:"includesDatabase"`
	Tables           []string       `gorm:"type:text[]" json:"tables,omitempty"`
	RetentionDays    int            `gorm:"default:30" json:"retentionDays"`
	CreatedBy        string         `gorm:"type:uuid;not null" json:"createdBy"`
	CreatedAt        time.Time      `json:"createdAt"`
	CompletedAt      *time.Time     `json:"completedAt,omitempty"`
	Error            string         `gorm:"type:text" json:"error,omitempty"`
	RestoredAt       *time.Time     `json:"restoredAt,omitempty"`
	RestoredBy       string         `gorm:"type:uuid" json:"restoredBy,omitempty"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

// TableName returns the table name for ScheduledItem
func (ScheduledItem) TableName() string {
	return "scheduled_items"
}

// TableName returns the table name for CustomReport
func (CustomReport) TableName() string {
	return "custom_reports"
}

// TableName returns the table name for SupportTicket
func (SupportTicket) TableName() string {
	return "support_tickets"
}

// TableName returns the table name for TicketMessage
func (TicketMessage) TableName() string {
	return "ticket_messages"
}

// TableName returns the table name for Backup
func (Backup) TableName() string {
	return "backups"
}
