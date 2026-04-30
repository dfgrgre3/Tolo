package services

import (
	"thanawy-backend/internal/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenService struct{}

type TokenClaims struct {
	Role string `json:"role"`
	JTI  string `json:"jti"` // Added for session tracking
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	JTI          string `json:"jti"`
}

func (s *TokenService) GenerateTokenPair(userId, role string) (*TokenPair, error) {
	cfg := config.Load()
	jti := uuid.New().String()

	// Access Token (Short-lived: 15 minutes)
	accessClaims := TokenClaims{
		Role: role,
		JTI:  jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userId,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	// Refresh Token (Long-lived: 30 days)
	refreshClaims := jwt.RegisteredClaims{
		Subject:   userId,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ID:        jti,
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString([]byte(cfg.JWTSecret))
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		JTI:          jti,
	}, nil
}

func (s *TokenService) GenerateAccessToken(userId, role string) (string, error) {
	cfg := config.Load()
	jti := uuid.New().String()

	claims := TokenClaims{
		Role: role,
		JTI:  jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userId,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(cfg.JWTSecret))
}

func (s *TokenService) ValidateToken(tokenString string) (*TokenClaims, error) {
	cfg := config.Load()
	token, err := jwt.ParseWithClaims(tokenString, &TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(cfg.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*TokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}
