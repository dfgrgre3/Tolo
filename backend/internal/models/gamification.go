package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
	"time"
)

type Achievement struct {
	ID            string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Key           string         `gorm:"uniqueIndex;not null;column:key" json:"key"`
	Title         string         `gorm:"not null;column:title" json:"title"`
	Description   string         `gorm:"column:description" json:"description"`
	Icon          string         `gorm:"column:icon" json:"icon"`
	Rarity        string         `gorm:"default:'common';column:rarity" json:"rarity"`
	XpReward      int            `gorm:"default:0;column:xp_reward" json:"xpReward"`
	IsSecret      bool           `gorm:"default:false;column:is_secret" json:"isSecret"`
	Category      string         `gorm:"column:category" json:"category"`
	Difficulty    string         `gorm:"default:'EASY';column:difficulty" json:"difficulty"`
	UnlockedCount int            `gorm:"default:0;column:unlocked_count" json:"unlockedCount"`
	Criteria      string         `gorm:"type:text;column:criteria" json:"criteria"`
	CreatedAt     time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt     time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Reward struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Description string         `gorm:"column:description" json:"description"`
	Cost        int            `gorm:"default:0;column:cost" json:"cost"`
	Stock       int            `gorm:"default:-1;column:stock" json:"stock"`
	Image       string         `gorm:"column:image" json:"image"`
	Type        string         `gorm:"default:'VIRTUAL';column:type" json:"type"`
	IsActive    bool           `gorm:"default:true;column:is_active" json:"isActive"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Season struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Description string         `gorm:"column:description" json:"description"`
	StartDate   time.Time      `gorm:"column:start_date" json:"startDate"`
	EndDate     time.Time      `gorm:"column:end_date" json:"endDate"`
	IsActive    bool           `gorm:"default:false;column:is_active" json:"isActive"`
	Rewards     string         `gorm:"type:text;column:rewards" json:"rewards"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type Challenge struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	Title       string         `gorm:"not null;column:title" json:"title"`
	Description string         `gorm:"column:description" json:"description"`
	Type        string         `gorm:"default:'daily';column:type" json:"type"`
	Category    string         `gorm:"column:category" json:"category"`
	XpReward    int            `gorm:"default:0;column:xp_reward" json:"xpReward"`
	Difficulty  string         `gorm:"default:'EASY';column:difficulty" json:"difficulty"`
	IsActive    bool           `gorm:"default:true;column:is_active" json:"isActive"`
	StartDate   *time.Time     `gorm:"column:start_date" json:"startDate"`
	EndDate     *time.Time     `gorm:"column:end_date" json:"endDate"`
	SubjectID   *string        `gorm:"index;type:uuid;column:subject_id;constraint:OnDelete:SET NULL" json:"subjectId"`
	Subject     *Subject       `json:"subject"`
	CreatedAt   time.Time      `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type UserAchievement struct {
	ID            string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID        string         `gorm:"index;type:uuid;not null;column:user_id" json:"userId"`
	AchievementID string         `gorm:"index;type:uuid;not null;column:achievement_id" json:"achievementId"`
	UnlockedAt    time.Time      `gorm:"column:unlocked_at" json:"unlockedAt"`
	User          *User          `json:"user"`
	Achievement   *Achievement   `json:"achievement"`
	DeletedAt     gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

type UserChallenge struct {
	ID          string         `gorm:"primaryKey;type:uuid;column:id" json:"id"`
	UserID      string         `gorm:"index;type:uuid;not null;column:user_id" json:"userId"`
	ChallengeID string         `gorm:"index;type:uuid;not null;column:challenge_id" json:"challengeId"`
	Progress    int            `gorm:"default:0;column:progress" json:"progress"`
	IsCompleted bool           `gorm:"default:false;column:is_completed" json:"isCompleted"`
	CompletedAt *time.Time     `gorm:"column:completed_at" json:"completedAt"`
	User        *User          `json:"user"`
	Challenge   *Challenge     `json:"challenge"`
	DeletedAt   gorm.DeletedAt `gorm:"index;column:deleted_at" json:"-"`
}

func (Achievement) TableName() string { return "Achievement" }
func (a *Achievement) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = uuid.New().String()
	}
	return nil
}

func (Reward) TableName() string { return "Reward" }
func (r *Reward) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		r.ID = uuid.New().String()
	}
	return nil
}

func (Season) TableName() string { return "Season" }
func (s *Season) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = uuid.New().String()
	}
	return nil
}

func (Challenge) TableName() string { return "Challenge" }
func (c *Challenge) BeforeCreate(tx *gorm.DB) error {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return nil
}

func (UserAchievement) TableName() string { return "UserAchievement" }
func (ua *UserAchievement) BeforeCreate(tx *gorm.DB) error {
	if ua.ID == "" {
		ua.ID = uuid.New().String()
	}
	if ua.UnlockedAt.IsZero() {
		ua.UnlockedAt = time.Now()
	}
	return nil
}

func (UserChallenge) TableName() string { return "UserChallenge" }
func (uc *UserChallenge) BeforeCreate(tx *gorm.DB) error {
	if uc.ID == "" {
		uc.ID = uuid.New().String()
	}
	return nil
}
