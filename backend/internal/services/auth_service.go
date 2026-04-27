package services

import (
	"errors"
	"fmt"
	"math/rand"
	"strings"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	repo *repository.UserRepository
}

func (s *AuthService) getRepo() *repository.UserRepository {
	if s.repo == nil {
		s.repo = repository.NewUserRepository(db.DB)
	}
	return s.repo
}

type RegisterInput struct {
	Email           string
	Username        string
	Password        string
	Role            models.UserRole
	IP              string
	UserAgent       string
	Phone           string
	GradeLevel      string
	EducationType   string
	Section         string
	ReferredByCode  string
}

func (s *AuthService) Register(input RegisterInput) (*models.User, error) {
	// 1. Normalize email
	email := strings.ToLower(strings.TrimSpace(input.Email))

	// 2. Check if user exists
	_, err := s.getRepo().FindByEmail(email)
	if err == nil {
		// User already exists
		return nil, errors.New("user already exists")
	}

	// 3. Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), 12)
	if err != nil {
		return nil, err
	}

	// 4. Create user
	user := models.User{
		Email:        email,
		Username:     &input.Username,
		PasswordHash: string(hashedPassword),
		Role:         input.Role,
		Status:       models.StatusActive,
		Phone:        &input.Phone,
		GradeLevel:   &input.GradeLevel,
		EducationType: &input.EducationType,
		Section:      &input.Section,
	}

	if err := s.getRepo().Create(&user); err != nil {
		return nil, err
	}

	// 6. Log security event (TBD)

	return &user, nil
}

func (s *AuthService) Login(email, password, ip, userAgent string) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.getRepo().FindByEmail(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Timing safe: still do a bcrypt compare
			bcrypt.CompareHashAndPassword([]byte("$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki"), []byte(password))
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check status
	if user.Status != models.StatusActive {
		return nil, fmt.Errorf("account is %s", user.Status)
	}

	return user, nil
}

func (s *AuthService) generateRandomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
