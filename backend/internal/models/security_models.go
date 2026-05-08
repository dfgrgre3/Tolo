package models

import (
	"time"

	"gorm.io/gorm"
)

// TwoFactorSettings stores 2FA configuration for users
type TwoFactorSettings struct {
	ID              string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID          string         `gorm:"type:uuid;not null;uniqueIndex" json:"userId"`
	Method          string         `gorm:"size:20" json:"method"` // authenticator, sms, email, security_key
	Secret          string         `gorm:"size:100" json:"-"`     // Encrypted secret
	IsEnabled       bool           `gorm:"default:false" json:"isEnabled"`
	IsEnforced      bool           `gorm:"default:false" json:"isEnforced"`
	BackupCodes     []string       `gorm:"type:text[]" json:"-"` // Encrypted backup codes
	VerifiedDevices []string       `gorm:"type:text[]" json:"verifiedDevices"`
	PendingSetup    bool           `gorm:"default:false" json:"pendingSetup"`
	ActivatedAt     *time.Time     `json:"activatedAt,omitempty"`
	DeactivatedAt   *time.Time     `json:"deactivatedAt,omitempty"`
	LastUsedAt      *time.Time     `json:"lastUsedAt,omitempty"`
	CreatedAt       time.Time      `json:"createdAt"`
	UpdatedAt       time.Time      `json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	// Relationships
	User User `gorm:"foreignKey:UserID" json:"-"`
}

// IPWhitelistEntry represents an IP address in the whitelist
type IPWhitelistEntry struct {
	ID          string         `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	IPAddress   string         `gorm:"size:50;not null;index" json:"ipAddress"`
	CIDR        string         `gorm:"size:50" json:"cidr,omitempty"` // CIDR notation like 192.168.1.0/24
	Description string         `gorm:"size:500" json:"description,omitempty"`
	Type        string         `gorm:"size:20;not null" json:"type"`           // admin, api, webhook
	Status      string         `gorm:"size:20;default:'active'" json:"status"` // active, disabled
	IsTemporary bool           `gorm:"default:false" json:"isTemporary"`
	ExpiresAt   *time.Time     `json:"expiresAt,omitempty"`
	LastUsedAt  *time.Time     `json:"lastUsedAt,omitempty"`
	CreatedBy   string         `gorm:"type:uuid;not null" json:"createdBy"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Geo info
	Country string `gorm:"size:100" json:"country,omitempty"`
	City    string `gorm:"size:100" json:"city,omitempty"`
}

// IPWhitelistSettings stores global IP whitelist configuration
type IPWhitelistSettings struct {
	ID                 string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	IsEnabled          bool      `gorm:"default:false" json:"isEnabled"`
	EnforceForAdmins   bool      `gorm:"default:true" json:"enforceForAdmins"`
	EnforceForAPI      bool      `gorm:"default:false" json:"enforceForAPI"`
	DefaultAction      string    `gorm:"size:10;default:'allow'" json:"defaultAction"` // allow, deny
	AllowInternalIPs   bool      `gorm:"default:true" json:"allowInternalIPs"`
	InternalIPRanges   []string  `gorm:"type:text[]" json:"internalIPRanges"`
	LogBlockedAttempts bool      `gorm:"default:true" json:"logBlockedAttempts"`
	NotifyOnViolation  bool      `gorm:"default:true" json:"notifyOnViolation"`
	NotifyEmail        string    `gorm:"size:255" json:"notifyEmail,omitempty"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// BlockedIPAttempt logs blocked access attempts
type BlockedIPAttempt struct {
	ID          string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	IPAddress   string    `gorm:"size:50;not null;index" json:"ipAddress"`
	Endpoint    string    `gorm:"size:500" json:"endpoint"`
	Method      string    `gorm:"size:10" json:"method"`
	UserAgent   string    `gorm:"type:text" json:"userAgent,omitempty"`
	Location    string    `gorm:"size:200" json:"location,omitempty"`
	Reason      string    `gorm:"size:200" json:"reason"`
	UserID      string    `gorm:"type:uuid;index" json:"userId,omitempty"`
	Count       int       `gorm:"default:1" json:"count"`
	AttemptedAt time.Time `json:"attemptedAt"`
	CreatedAt   time.Time `json:"createdAt"`
}

// SecurityAuditLog stores security-related audit events
type SecurityAuditLog struct {
	ID        string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	EventType string    `gorm:"size:50;not null" json:"eventType"` // 2fa_enabled, session_revoked, ip_blocked, etc.
	UserID    string    `gorm:"type:uuid;index" json:"userId,omitempty"`
	IPAddress string    `gorm:"size:50" json:"ipAddress"`
	UserAgent string    `gorm:"type:text" json:"userAgent,omitempty"`
	Details   JSONMap   `gorm:"type:jsonb" json:"details,omitempty"`
	Severity  string    `gorm:"size:20;default:'info'" json:"severity"` // info, warning, critical
	Status    string    `gorm:"size:20;default:'unread'" json:"status"` // unread, read, archived
	CreatedAt time.Time `json:"createdAt"`
}

// DefaultInternalIPRanges are standard RFC 1918 and loopback ranges
var DefaultInternalIPRanges = []string{"127.0.0.1/8", "10.0.0.0/8", "192.168.0.0/16"}

// TableName returns the table name for TwoFactorSettings
func (TwoFactorSettings) TableName() string {
	return "two_factor_settings"
}

// TableName returns the table name for IPWhitelistEntry
func (IPWhitelistEntry) TableName() string {
	return "ip_whitelist_entries"
}

// TableName returns the table name for IPWhitelistSettings
func (IPWhitelistSettings) TableName() string {
	return "ip_whitelist_settings"
}

// TableName returns the table name for BlockedIPAttempt
func (BlockedIPAttempt) TableName() string {
	return "blocked_ip_attempts"
}

// TableName returns the table name for SecurityAuditLog
func (SecurityAuditLog) TableName() string {
	return "security_audit_logs"
}
