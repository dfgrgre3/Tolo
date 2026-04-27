package services

import (
	"thanawy-backend/internal/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct{}

type TokenClaims struct {
	Role string `json:"role"`
	jwt.RegisteredClaims
}

func (s *TokenService) GenerateAccessToken(userId, role string) (string, error) {
	cfg := config.Load()

	claims := TokenClaims{
		Role: role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userId,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // 24h for now
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}
