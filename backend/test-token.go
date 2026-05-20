package main

import (
	"fmt"
	"thanawy-backend/internal/config"
	"time"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type TokenClaims struct {
	Role string `json:"role"`
	JTI  string `json:"jti"`
	jwt.RegisteredClaims
}

func main() {
	cfg := config.Load()
	jti := uuid.New().String()

	claims := TokenClaims{
		Role: "USER",
		JTI:  jti,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "c2b6f178-dc29-4592-805c-3f41a8b11111", // dummy valid uuid
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ID:        jti,
		},
	}
	token, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(cfg.JWTSecret))
	fmt.Println(token)
}
