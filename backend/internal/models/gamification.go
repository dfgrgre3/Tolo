package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Achievement struct {
	ID            string         `gorm:"primaryKey;type:text" json:"id"`
	Key           string         `gorm:"uniqueIndex;not null" json:"key"`
	Title         string         `gorm:"not null" json:"title"`
	Description   string         `json:"description"`
	Icon          string         `json:"icon"`
	Rarity        string         `gorm:"default:'common'" json:"rarity"`
	XpReward      int            `gorm:"default:0" json:"xpReward"`
	IsSecret      bool           `gorm:"default:false" json:"isSecret"`
	Category      string         `json:"category"`
	Difficulty    string         `gorm:"default:'EASY'" json:"difficulty"`
	UnlockedCount int            `gorm:"default:0" json:"unlockedCount"`
	Criteria      string         `gorm:"type:text" json:"criteria"` // JSON string of criteria
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type Reward struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	Cost        int            `gorm:"default:0" json:"cost"`
	Stock       int            `gorm:"default:-1" json:"stock"` // -1 for unlimited
	Image       string         `json:"image"`
	Type        string         `gorm:"default:'VIRTUAL'" json:"type"` // VIRTUAL, PHYSICAL
	IsActive    bool           `gorm:"default:true" json:"isActive"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Season struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	StartDate   time.Time      `json:"startDate"`
	EndDate     time.Time      `json:"endDate"`
	IsActive    bool           `gorm:"default:false" json:"isActive"`
	Rewards     string         `gorm:"type:text" json:"rewards"` // JSON string of rewards associated with season
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type Challenge struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	Type        string         `gorm:"default:'daily'" json:"type"` // daily, weekly, monthly, special
	Category    string         `json:"category"`
	XpReward    int            `gorm:"default:0" json:"xpReward"`
	Difficulty  string         `gorm:"default:'EASY'" json:"difficulty"` // EASY, MEDIUM, HARD, EXPERT
	IsActive    bool           `gorm:"default:true" json:"isActive"`
	StartDate   *time.Time     `json:"startDate"`
	EndDate     *time.Time     `json:"endDate"`
	SubjectID   *string        `gorm:"index;type:text;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject       `json:"subject"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserAchievement struct {
	ID            string         `gorm:"primaryKey;type:text" json:"id"`
	UserID        string         `gorm:"index;type:text;not null" json:"userId"`
	AchievementID string         `gorm:"index;type:text;not null" json:"achievementId"`
	UnlockedAt    time.Time      `json:"unlockedAt"`
	User          *User          `json:"user"`
	Achievement   *Achievement   `json:"achievement"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type UserChallenge struct {
	ID          string         `gorm:"primaryKey;type:text" json:"id"`
	UserID      string         `gorm:"index;type:text;not null" json:"userId"`
	ChallengeID string         `gorm:"index;type:text;not null" json:"challengeId"`
	Progress    int            `gorm:"default:0" json:"progress"`
	IsCompleted bool           `gorm:"default:false" json:"isCompleted"`
	CompletedAt *time.Time     `json:"completedAt"`
	User        *User          `json:"user"`
	Challenge   *Challenge     `json:"challenge"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (Achievement) TableName() string { return "Achievement" }
func (a *Achievement) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" { a.ID = uuid.New().String() }
	return nil
}

func (Reward) TableName() string { return "Reward" }
func (r *Reward) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" { r.ID = uuid.New().String() }
	return nil
}

func (Season) TableName() string { return "Season" }
func (s *Season) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" { s.ID = uuid.New().String() }
	return nil
}

func (Challenge) TableName() string { return "Challenge" }
func (c *Challenge) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" { c.ID = uuid.New().String() }
	return nil
}

func (UserAchievement) TableName() string { return "UserAchievement" }
func (ua *UserAchievement) BeforeCreate(tx *gorm.DB) error {
	if ua.ID == "" { ua.ID = uuid.New().String() }
	if ua.UnlockedAt.IsZero() { ua.UnlockedAt = time.Now() }
	return nil
}

func (UserChallenge) TableName() string { return "UserChallenge" }
func (uc *UserChallenge) BeforeCreate(tx *gorm.DB) error {
	if uc.ID == "" { uc.ID = uuid.New().String() }
	return nil
}
