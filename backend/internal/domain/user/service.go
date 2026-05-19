package user

import (
	"context"
	"errors"
	"fmt"
	"time"
)

var (
	ErrUserNotFound     = errors.New("user not found")
	ErrUserExists       = errors.New("user already exists")
	ErrInvalidEmail     = errors.New("invalid email")
	ErrInvalidPassword  = errors.New("invalid password")
	ErrInvalidRole      = errors.New("invalid role")
	ErrCannotDeleteSelf = errors.New("cannot delete yourself")
)

type Service struct {
	repo     Repository
	hasher   PasswordHasher
	publisher EventPublisher
}

func NewService(repo Repository, hasher PasswordHasher, publisher EventPublisher) *Service {
	return &Service{
		repo:      repo,
		hasher:    hasher,
		publisher: publisher,
	}
}

func (s *Service) CreateUser(ctx context.Context, input CreateUserInput) (*User, error) {
	if input.Email == "" {
		return nil, ErrInvalidEmail
	}

	if input.Password == "" {
		return nil, ErrInvalidPassword
	}

	if !isValidRole(input.Role) {
		input.Role = RoleStudent
	}

	existing, err := s.repo.FindByEmail(ctx, input.Email)
	if err == nil && existing != nil {
		return nil, ErrUserExists
	}

	hashedPassword, err := s.hasher.Hash(input.Password)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	user := &User{
		Email:        input.Email,
		Name:         input.Name,
		Username:     input.Username,
		Phone:        input.Phone,
		Role:         input.Role,
		Status:       StatusActive,
		PasswordHash: hashedPassword,
		Balance:      0,
		AiCredits:    0,
		ExamCredits:  0,
		TotalXP:      0,
		Level:        1,
	}

	if err := s.repo.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}

	s.publishEvent(ctx, UserEvent{
		Type:   "user.created",
		UserID: user.ID,
		Data: map[string]interface{}{
			"email": user.Email,
			"role":  string(user.Role),
		},
	})

	return user, nil
}

func (s *Service) GetUser(ctx context.Context, id string) (*User, error) {
	user, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, ErrUserNotFound
	}
	return user, nil
}

func (s *Service) UpdateUser(ctx context.Context, input UpdateUserInput) (*User, error) {
	user, err := s.repo.FindByID(ctx, input.ID)
	if err != nil {
		return nil, ErrUserNotFound
	}

	if input.Name != nil {
		user.Name = input.Name
	}
	if input.Username != nil {
		user.Username = input.Username
	}
	if input.Phone != nil {
		user.Phone = input.Phone
	}
	if input.Avatar != nil {
		user.Avatar = input.Avatar
	}
	if input.Bio != nil {
		user.Bio = input.Bio
	}

	if err := s.repo.Update(ctx, user); err != nil {
		return nil, fmt.Errorf("update user: %w", err)
	}

	s.publishEvent(ctx, UserEvent{
		Type:   "user.updated",
		UserID: user.ID,
		Data: map[string]interface{}{
			"fields": []string{"name", "username", "phone", "avatar", "bio"},
		},
	})

	return user, nil
}

func (s *Service) DeleteUser(ctx context.Context, id string, requesterID string) error {
	if id == requesterID {
		return ErrCannotDeleteSelf
	}

	_, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return ErrUserNotFound
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	s.publishEvent(ctx, UserEvent{
		Type:   "user.deleted",
		UserID: id,
		Data: map[string]interface{}{
			"deleted_by": requesterID,
		},
	})

	return nil
}

func (s *Service) ListUsers(ctx context.Context, filter ListUsersFilter) (ListUsersResult, error) {
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.Limit <= 0 {
		filter.Limit = 20
	}
	if filter.Limit > 100 {
		filter.Limit = 100
	}

	return s.repo.List(ctx, filter)
}

func (s *Service) GetDashboardStats(ctx context.Context) (map[string]interface{}, error) {
	totalUsers, err := s.repo.CountByStatus(ctx, StatusActive)
	if err != nil {
		return nil, fmt.Errorf("count active users: %w", err)
	}

	newUsersToday, err := s.repo.CountCreatedSince(ctx, time.Now().Truncate(24*time.Hour))
	if err != nil {
		return nil, fmt.Errorf("count new users today: %w", err)
	}

	sevenDaysAgo := time.Now().AddDate(0, 0, -7)
	newUsersThisWeek, err := s.repo.CountCreatedSince(ctx, sevenDaysAgo)
	if err != nil {
		return nil, fmt.Errorf("count new users this week: %w", err)
	}

	return map[string]interface{}{
		"totalUsers":       totalUsers,
		"newUsersToday":    newUsersToday,
		"newUsersThisWeek": newUsersThisWeek,
	}, nil
}

func (s *Service) publishEvent(ctx context.Context, event UserEvent) {
	event.Timestamp = time.Now()
	if s.publisher != nil {
		_ = s.publisher.Publish(ctx, event)
	}
}

func isValidRole(role Role) bool {
	switch role {
	case RoleAdmin, RoleTeacher, RoleStudent, RoleModerator:
		return true
	default:
		return false
	}
}
