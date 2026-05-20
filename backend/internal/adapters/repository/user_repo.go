package repository

import (
	"context"
	"time"

	"thanawy-backend/internal/domain/user"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(database *gorm.DB) user.Repository {
	return &userRepository{db: database}
}

func (r *userRepository) Create(ctx context.Context, u *user.User) error {
	now := time.Now()
	u.CreatedAt = now
	u.UpdatedAt = now

	record := toUserRecord(u)
	return r.db.WithContext(ctx).Create(record).Error
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*user.User, error) {
	var record userRecord
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&record).Error; err != nil {
		return nil, err
	}
	return record.toDomain(), nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*user.User, error) {
	var record userRecord
	if err := r.db.WithContext(ctx).Where("email = ?", email).First(&record).Error; err != nil {
		return nil, err
	}
	return record.toDomain(), nil
}

func (r *userRepository) Update(ctx context.Context, u *user.User) error {
	u.UpdatedAt = time.Now()
	record := toUserRecord(u)
	return r.db.WithContext(ctx).Save(record).Error
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&userRecord{}).Error
}

func (r *userRepository) List(ctx context.Context, filter user.ListUsersFilter) (user.ListUsersResult, error) {
	query := r.db.WithContext(ctx).Model(&userRecord{})

	if filter.Role != nil {
		query = query.Where("role = ?", *filter.Role)
	}
	if filter.Status != nil {
		query = query.Where("status = ?", *filter.Status)
	}
	if filter.Search != nil {
		search := "%" + *filter.Search + "%"
		query = query.Where("email ILIKE ? OR name ILIKE ?", search, search)
	}

	var total int64
	query.Count(&total)

	var records []userRecord
	query.Order("created_at DESC").
		Limit(filter.Limit).
		Offset((filter.Page - 1) * filter.Limit).
		Find(&records)

	users := make([]user.User, len(records))
	for i, r := range records {
		users[i] = *r.toDomain()
	}

	totalPages := (total + int64(filter.Limit) - 1) / int64(filter.Limit)

	return user.ListUsersResult{
		Users:      users,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

func (r *userRepository) CountByRole(ctx context.Context, role user.Role) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&userRecord{}).Where("role = ?", role).Count(&count).Error
	return count, err
}

func (r *userRepository) CountByStatus(ctx context.Context, status user.Status) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&userRecord{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

func (r *userRepository) CountCreatedSince(ctx context.Context, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&userRecord{}).Where("created_at >= ?", since).Count(&count).Error
	return count, err
}

type userRecord struct {
	ID            string     `gorm:"column:id;primaryKey;type:uuid"`
	Email         string     `gorm:"column:email"`
	Name          *string    `gorm:"column:name"`
	Username      *string    `gorm:"column:username"`
	Phone         *string    `gorm:"column:phone"`
	Avatar        *string    `gorm:"column:avatar"`
	Role          string     `gorm:"column:role"`
	Status        string     `gorm:"column:status"`
	PasswordHash  string     `gorm:"column:passwordHash"`
	EmailVerified bool       `gorm:"column:emailVerified"`
	Bio           *string    `gorm:"column:bio"`
	Balance       float64    `gorm:"column:balance"`
	AiCredits     int        `gorm:"column:aiCredits"`
	ExamCredits   int        `gorm:"column:examCredits"`
	TotalXP       int        `gorm:"column:totalXP"`
	Level         int        `gorm:"column:level"`
	CurrentStreak int        `gorm:"column:currentStreak"`
	LongestStreak int        `gorm:"column:longestStreak"`
	CreatedAt     time.Time  `gorm:"column:createdAt"`
	UpdatedAt     time.Time  `gorm:"column:updatedAt"`
	LastLogin     *time.Time `gorm:"column:lastLogin"`
}

func (userRecord) TableName() string {
	return "User"
}

func toUserRecord(u *user.User) *userRecord {
	return &userRecord{
		ID:            u.ID,
		Email:         u.Email,
		Name:          u.Name,
		Username:      u.Username,
		Phone:         u.Phone,
		Avatar:        u.Avatar,
		Role:          string(u.Role),
		Status:        string(u.Status),
		PasswordHash:  u.PasswordHash,
		EmailVerified: u.EmailVerified,
		Bio:           u.Bio,
		Balance:       u.Balance,
		AiCredits:     u.AiCredits,
		ExamCredits:   u.ExamCredits,
		TotalXP:       u.TotalXP,
		Level:         u.Level,
		CurrentStreak: u.CurrentStreak,
		LongestStreak: u.LongestStreak,
		CreatedAt:     u.CreatedAt,
		UpdatedAt:     u.UpdatedAt,
		LastLogin:     u.LastLogin,
	}
}

func (r *userRecord) toDomain() *user.User {
	return &user.User{
		ID:            r.ID,
		Email:         r.Email,
		Name:          r.Name,
		Username:      r.Username,
		Phone:         r.Phone,
		Avatar:        r.Avatar,
		Role:          user.Role(r.Role),
		Status:        user.Status(r.Status),
		PasswordHash:  r.PasswordHash,
		EmailVerified: r.EmailVerified,
		Bio:           r.Bio,
		Balance:       r.Balance,
		AiCredits:     r.AiCredits,
		ExamCredits:   r.ExamCredits,
		TotalXP:       r.TotalXP,
		Level:         r.Level,
		CurrentStreak: r.CurrentStreak,
		LongestStreak: r.LongestStreak,
		CreatedAt:     r.CreatedAt,
		UpdatedAt:     r.UpdatedAt,
		LastLogin:     r.LastLogin,
	}
}

type bcryptHasher struct{}

func NewBcryptHasher() user.PasswordHasher {
	return &bcryptHasher{}
}

func (h *bcryptHasher) Hash(password string) (string, error) {
	return hashPassword(password)
}

func (h *bcryptHasher) Verify(password, hash string) bool {
	return verifyPassword(password, hash)
}

type noOpPublisher struct{}

func NewNoOpPublisher() user.EventPublisher {
	return &noOpPublisher{}
}

func (p *noOpPublisher) Publish(ctx context.Context, event user.UserEvent) error {
	return nil
}

func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func verifyPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
