package services

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"time"
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
	Email          string
	Username       string
	Password       string
	Role           models.UserRole
	IP             string
	UserAgent      string
	Phone          string
	GradeLevel     string
	EducationType  string
	Section        string
	ReferredByCode string
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
		Email:         email,
		Username:      &input.Username,
		PasswordHash:  string(hashedPassword),
		Role:          input.Role,
		Status:        models.StatusActive,
		Phone:         &input.Phone,
		GradeLevel:    &input.GradeLevel,
		EducationType: &input.EducationType,
		Section:       &input.Section,
	}

	if err := s.getRepo().Create(&user); err != nil {
		return nil, err
	}

	// 6. Log security event (TBD)

	return &user, nil
}

func (s *AuthService) Login(email, password, ip, userAgent string) (*models.User, error) {
	email = strings.ToLower(strings.TrimSpace(email))

	user, err := s.getRepo().FindByEmailNoCache(email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Timing safe: still do a bcrypt compare
			bcrypt.CompareHashAndPassword([]byte("$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki"), []byte(password))
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Check password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Check status
	if user.Status != models.StatusActive {
		return nil, fmt.Errorf("account is %s", user.Status)
	}

	return user, nil
}

func (s *AuthService) generateRandomString(n int) (string, error) {
	byteLen := n
	if byteLen < 32 {
		byteLen = 32
	}
	b := make([]byte, byteLen)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate secure token: %w", err)
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	if len(token) > n {
		return token[:n], nil
	}
	return token, nil
}

func (s *AuthService) RequestMagicLink(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.getRepo().FindByEmailNoCache(email)
	if err != nil {
		return "", err
	}

	token, err := s.generateRandomString(32)
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(15 * time.Minute)

	user.MagicLinkToken = &token
	user.MagicLinkExpires = &expires

	if err := s.getRepo().Update(user); err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) VerifyMagicLink(token string) (*models.User, error) {
	var user models.User
	if err := db.DB.Where("\"magicLinkToken\" = ? AND \"magicLinkExpires\" > ?", token, time.Now()).First(&user).Error; err != nil {
		return nil, errors.New("invalid or expired magic link")
	}

	// Clear token
	user.MagicLinkToken = nil
	user.MagicLinkExpires = nil
	if err := s.getRepo().Update(&user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) RequestPasswordReset(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.getRepo().FindByEmailNoCache(email)
	if err != nil {
		return "", err
	}

	token, err := s.generateRandomString(32)
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(1 * time.Hour)

	user.ResetPasswordToken = &token
	user.ResetPasswordExpires = &expires

	if err := s.getRepo().Update(user); err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) ResetPassword(token, newPassword string) error {
	var user models.User
	if err := db.DB.Where("\"resetPasswordToken\" = ? AND \"resetPasswordExpires\" > ?", token, time.Now()).First(&user).Error; err != nil {
		return errors.New("invalid or expired reset token")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 12)
	if err != nil {
		return err
	}

	user.PasswordHash = string(hashedPassword)
	user.ResetPasswordToken = nil
	user.ResetPasswordExpires = nil

	return s.getRepo().Update(&user)
}

func (s *AuthService) RequestEmailVerification(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	user, err := s.getRepo().FindByEmailNoCache(email)
	if err != nil {
		return "", err
	}

	token, err := s.generateRandomString(32)
	if err != nil {
		return "", err
	}
	expires := time.Now().Add(24 * time.Hour)

	user.VerificationToken = &token
	user.VerificationExpires = &expires

	if err := s.getRepo().Update(user); err != nil {
		return "", err
	}

	return token, nil
}

func (s *AuthService) VerifyEmail(token string) error {
	var user models.User
	if err := db.DB.Where("\"verificationToken\" = ? AND \"verificationExpires\" > ?", token, time.Now()).First(&user).Error; err != nil {
		return errors.New("invalid or expired verification token")
	}

	user.EmailVerified = true
	user.VerificationToken = nil
	user.VerificationExpires = nil

	return s.getRepo().Update(&user)
}
