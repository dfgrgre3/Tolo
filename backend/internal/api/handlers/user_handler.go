package handlers

import (
	"crypto/hmac"
	cryptoRand "crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"
	"thanawy-backend/internal/services"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm/clause"
	"time"

	"github.com/redis/go-redis/v9"
)

var authService = &services.AuthService{}
var tokenService = &services.TokenService{}
var userRepo *repository.UserRepository
var sessionRepo *repository.SessionRepository

const (
	MaxLoginAttempts           = 5
	LockoutDuration            = 15 * time.Minute
	errFailedToGenerateTokens  = "Failed to generate tokens"
	refreshTokenPath           = "/api/auth/refresh"
	errInvalidEmail            = "Invalid email"
	userIDQuery                = "user_id = ?"
)

func getLoginAttemptsKey(email, ip string) string {
	return fmt.Sprintf("login_attempts:%s:%s", email, ip)
}

func isIPBlocked(c *gin.Context, email, ip string) bool {
	if db.Redis == nil {
		return false
	}
	key := getLoginAttemptsKey(email, ip)
	attempts, err := db.Redis.Get(c.Request.Context(), key).Int()
	if err != nil && err != redis.Nil {
		return false
	}
	return attempts >= MaxLoginAttempts
}

func recordLoginAttempt(c *gin.Context, email, ip string, success bool) {
	if db.Redis == nil {
		return
	}
	key := getLoginAttemptsKey(email, ip)
	if success {
		db.Redis.Del(c.Request.Context(), key)
		return
	}

	db.Redis.Incr(c.Request.Context(), key)
	db.Redis.Expire(c.Request.Context(), key, LockoutDuration)
}


func getUserRepo() *repository.UserRepository {
	if userRepo == nil {
		userRepo = repository.NewUserRepository(db.DB)
	}
	return userRepo
}

func getSessionRepo() *repository.SessionRepository {
	if sessionRepo == nil {
		sessionRepo = repository.NewSessionRepository(db.DB)
	}
	return sessionRepo
}

// isProduction checks if the app is running in production mode
func isProduction() bool {
	cfg := config.Load()
	return cfg.Environment == "production"
}

// Mock geolocation helper
func getMockLocation(_ string) *string {
	loc := "القاهرة، مصر"
	return &loc
}

type LoginRequest struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required,min=6"`
	RememberMe bool   `json:"rememberMe"`
}

// Login handles user authentication
// @Summary User login
// @Description Authenticate user with email and password
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} map[string]interface{} "Login successful"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /auth/login [post]
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, "بيانات الدخول غير صالحة: "+err.Error())
		return
	}

	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if isIPBlocked(c, email, ip) {
		api_response.Error(c, http.StatusTooManyRequests, "تم حظر محاولات الدخول مؤقتاً بسبب محاولات فاشلة متكررة. يرجى المحاولة بعد 15 دقيقة.")
		return
	}

	user, err := authService.Login(email, req.Password, ip, userAgent)
	if err != nil {
		recordLoginAttempt(c, email, ip, false)
		services.GetAuditService().LogAsync("", services.AuditEventLoginFailed, "auth", email, map[string]interface{}{"error": err.Error()}, ip, userAgent)
		_ = LogSecurityEvent("", models.SecurityEventLoginFailed, ip, userAgent, nil, nil)
		// Return generic error message for security (prevent user enumeration)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	recordLoginAttempt(c, email, ip, true)

	if user.TwoFactorEnabled {
		c.JSON(http.StatusOK, gin.H{
			"success":     true,
			"requires2FA": true,
			"user": gin.H{
				"id":    user.ID,
				"email": user.Email,
			},
		})
		return
	}

	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errFailedToGenerateTokens, "details": err.Error()})
		return
	}

	location := getMockLocation(ip)
	expiryDuration := 24 * time.Hour
	if req.RememberMe {
		expiryDuration = 30 * 24 * time.Hour
	}

	session := &models.UserSession{
		ID:           tokens.JTI,
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    userAgent,
		IP:           ip,
		Location:     location,
		ExpiresAt:    time.Now().Add(expiryDuration),
		LastAccessed: time.Now(),
	}

	activeSessions, _ := getSessionRepo().GetActiveSessions(user.ID)
	if len(activeSessions) >= 2 {
		_ = LogSecurityEvent(user.ID, "DEVICE_LIMIT_REACHED", ip, userAgent, location, nil)
		oldestSession := activeSessions[0]
		_ = getSessionRepo().RevokeSessionByJTI(oldestSession.ID)
	}

	if err := getSessionRepo().Create(session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session", "details": err.Error()})
		return
	}

	_ = LogSecurityEvent(user.ID, models.SecurityEventLoginSuccess, ip, userAgent, location, nil)
	services.GetAuditService().LogAsync(user.ID, services.AuditEventLogin, "auth", user.ID, map[string]interface{}{"ip": ip}, ip, userAgent)

	c.SetCookie("access_token", tokens.AccessToken, 3600*24, "/", "", isProduction(), true)
	refreshExpiry := int(expiryDuration.Seconds())
	c.SetCookie("refresh_token", tokens.RefreshToken, refreshExpiry, refreshTokenPath, "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
		"metadata": gin.H{
			"lastLogin": user.UpdatedAt,
			"ip":        ip,
			"device":    userAgent,
			"location":  location,
		},
	})
}

func Verify2FA(c *gin.Context) {
	var req struct {
		UserID     string `json:"userId"`
		Token      string `json:"token"`
		RememberMe bool   `json:"rememberMe"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	user, err := getUserRepo().FindByID(req.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": errUserNotFound})
		return
	}

	tokenValid := false

	if user.TwoFactorEnabled && user.TwoFactorSecret != nil && *user.TwoFactorSecret != "" {
		if validateTOTP(*user.TwoFactorSecret, req.Token) {
			tokenValid = true
		}
	}

	if !tokenValid && user.VerificationToken != nil && *user.VerificationToken == req.Token {
		if user.VerificationExpires != nil && user.VerificationExpires.After(time.Now()) {
			tokenValid = true
			db.DB.Model(&user).Updates(map[string]interface{}{
				"verification_token":   nil,
				"verification_expires": nil,
			})
		}
	}

	if !tokenValid {
		_ = LogSecurityEvent(user.ID, models.SecurityEvent2FAFailed, c.ClientIP(), c.Request.UserAgent(), nil, nil)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired verification code"})
		return
	}

	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errFailedToGenerateTokens})
		return
	}

	expiryDuration := 24 * time.Hour
	if req.RememberMe {
		expiryDuration = 30 * 24 * time.Hour
	}

	session := &models.UserSession{
		ID:           tokens.JTI,
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    c.Request.UserAgent(),
		IP:           c.ClientIP(),
		ExpiresAt:    time.Now().Add(expiryDuration),
		LastAccessed: time.Now(),
	}
	_ = getSessionRepo().Create(session)

	_ = LogSecurityEvent(user.ID, "2FA_SUCCESS", c.ClientIP(), c.Request.UserAgent(), nil, nil)

	c.SetCookie("access_token", tokens.AccessToken, 3600*24, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", tokens.RefreshToken, int(expiryDuration.Seconds()), refreshTokenPath, "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
	})
}

func validateTOTP(secretBase32 string, token string) bool {
	secret := strings.ToUpper(secretBase32)
	secretBytes, err := base32.StdEncoding.DecodeString(secret)
	if err != nil {
		return false
	}

	timeStep := time.Now().Unix() / 30

	for _, offset := range []int64{-1, 0, 1} {
		expectedToken := generateTOTP(secretBytes, timeStep+offset)
		if expectedToken == token {
			return true
		}
	}

	return false
}

func generateTOTP(secret []byte, timeStep int64) string {
	msg := make([]byte, 8)
	for i := 7; i >= 0; i-- {
		msg[i] = byte(timeStep & 0xff)
		timeStep >>= 8
	}

	mac := hmac.New(sha1.New, secret)
	mac.Write(msg)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	truncated := ((int(hash[offset]) & 0x7f) << 24) |
		((int(hash[offset+1]) & 0xff) << 16) |
		((int(hash[offset+2]) & 0xff) << 8) |
		(int(hash[offset+3]) & 0xff)

	code := truncated % 1000000
	return fmt.Sprintf("%06d", code)
}

func RequestMagicLink(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidEmail})
		return
	}

	token, err := authService.RequestMagicLink(req.Email)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "If an account exists, a link has been sent."})
		return
	}

	_ = LogSecurityEvent("", models.SecurityEventMagicLinkRequested, c.ClientIP(), c.Request.UserAgent(), nil, &token)

	link := "/verify-magic-link?token=" + token
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Magic link sent successfully",
		"debug":   link,
	})
}

func VerifyMagicLink(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	user, err := authService.VerifyMagicLink(token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": errFailedToGenerateTokens})
		return
	}

	session := &models.UserSession{
		ID:           tokens.JTI,
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    c.Request.UserAgent(),
		IP:           c.ClientIP(),
		ExpiresAt:    time.Now().Add(24 * time.Hour),
		LastAccessed: time.Now(),
	}
	_ = getSessionRepo().Create(session)

	_ = LogSecurityEvent(user.ID, models.SecurityEventMagicLinkLogin, c.ClientIP(), c.Request.UserAgent(), nil, nil)

	c.SetCookie("access_token", tokens.AccessToken, 3600*24, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", tokens.RefreshToken, 3600*24, refreshTokenPath, "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user":    user,
	})
}

func ForgotPassword(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidEmail})
		return
	}

	token, err := authService.RequestPasswordReset(req.Email)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "If an account exists, a reset link has been sent."})
		return
	}

	_ = LogSecurityEvent("", models.SecurityEventPasswordResetReq, c.ClientIP(), c.Request.UserAgent(), nil, &token)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password reset link sent",
		"debug":   "/reset-password?token=" + token,
	})
}

func ResetPassword(c *gin.Context) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"newPassword"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if err := authService.ResetPassword(req.Token, req.NewPassword); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Password reset successful"})
}

func VerifyEmail(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token is required"})
		return
	}

	if err := authService.VerifyEmail(token); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Email verified successfully"})
}

func ResendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidEmail})
		return
	}

	token, err := authService.RequestEmailVerification(req.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to generate verification link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Verification email sent",
		"debug":   "/verify-email?token=" + token,
	})
}

func RefreshToken(c *gin.Context) {
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Refresh token missing"})
		return
	}

	session, err := getSessionRepo().FindByRefreshToken(refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid session"})
		return
	}

	if time.Now().After(session.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Session expired"})
		return
	}

	user, err := getUserRepo().FindByID(session.UserID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": errUserNotFound})
		return
	}

	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh token"})
		return
	}

	_ = getSessionRepo().RevokeSessionByJTI(session.ID)

	newSession := &models.UserSession{
		ID:           tokens.JTI,
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    c.Request.UserAgent(),
		IP:           c.ClientIP(),
		Location:     session.Location,
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
		LastAccessed: time.Now(),
	}
	_ = getSessionRepo().Create(newSession)

	c.SetCookie("access_token", tokens.AccessToken, 3600*24, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", tokens.RefreshToken, 3600*24*30, refreshTokenPath, "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Logout handles user logout
// @Summary User logout
// @Description Invalidate user session and clear cookies
// @Tags Auth
// @Produce json
// @Success 200 {object} map[string]interface{} "Logout successful"
// @Router /auth/logout [post]
func Logout(c *gin.Context) {
	if token, err := c.Cookie("access_token"); err == nil {
		if claims, err := tokenService.ValidateToken(token); err == nil {
			_ = getSessionRepo().RevokeSessionByJTI(claims.JTI)
			services.GetAuditService().LogAsync(claims.Subject, services.AuditEventLogout, "auth", claims.Subject, nil, c.ClientIP(), c.Request.UserAgent())
		}
	}

	c.SetCookie("access_token", "", -1, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", "", -1, refreshTokenPath, "", isProduction(), true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
}

func GetAuthSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	var sessions []models.UserSession
	if err := db.DB.Where("user_id = ? AND "+isActiveQuery, userID, true).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"sessions": sessions, "success": true})
}

func DeleteAuthSession(c *gin.Context) {
	sessionID := c.Query("sessionId")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "sessionId is required"})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var session models.UserSession
	if err := db.DB.Where("id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found or access denied"})
		return
	}

	if err := getSessionRepo().RevokeSessionByJTI(sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke session"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func UpdateAuthSession(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true})
}

type RegisterRequest struct {
	Email         string `json:"email" binding:"required,email"`
	Password      string `json:"password" binding:"required,min=8"`
	Username      string `json:"username" binding:"required"`
	Phone         string `json:"phone"`
	GradeLevel    string `json:"gradeLevel"`
	EducationType string `json:"educationType"`
	Section       string `json:"section"`
}

// Register handles new user registration
// @Summary User registration
// @Description Register a new user account
// @Tags Auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} map[string]interface{} "Registration successful"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Router /auth/register [post]
func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input := services.RegisterInput{
		Email:         req.Email,
		Username:      req.Username,
		Password:      req.Password,
		Role:          models.RoleStudent,
		Phone:         req.Phone,
		GradeLevel:    req.GradeLevel,
		EducationType: req.EducationType,
		Section:       req.Section,
		IP:            c.ClientIP(),
		UserAgent:     c.Request.UserAgent(),
	}

	user, err := authService.Register(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	token, _ := authService.RequestEmailVerification(user.Email)

	services.GetAuditService().LogAsync(user.ID, "user.register", "user", user.ID, nil, c.ClientIP(), c.Request.UserAgent())
	GlobalNotifyAdmins("مستخدم جديد", fmt.Sprintf("انضم %s إلى المنصة", user.Email), "success")

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"user":    user,
		"message": "Registration successful. Please verify your email.",
		"debug":   "/verify-email?token=" + token,
	})
}

// GetProfile returns current user profile
// @Summary Get user profile
// @Description Get detailed profile of the currently authenticated user
// @Tags Auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Profile details"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /auth/me [get]
func GetProfile(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := getUserRepo().FindByID(userId.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errUserNotFound})
		return
	}

	// Expose effective permissions (role defaults + DB overrides) so the client matches PermissionRequired.
	profile := *user
	profile.Permissions = models.JSONStringArray(user.GetEffectivePermissions())

	c.JSON(http.StatusOK, gin.H{"user": &profile})
}

func GetUsers(c *gin.Context) {
	role := c.Query("role")
	search := c.Query("search")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var users []models.User
	query := db.DB

	if role != "" {
		query = query.Where("role = ?", role)
	}
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("email ILIKE ? OR name ILIKE ? OR username ILIKE ?", like, like, like)
	}

	var total int64
	query.Model(&models.User{}).Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	totalAdmins := int64(0)
	powerUsers := int64(0)
	db.DB.Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&totalAdmins)
	db.DB.Model(&models.User{}).Where("level >= ?", 10).Count(&powerUsers)

	items := make([]gin.H, 0, len(users))
	for _, user := range users {
		items = append(items, gin.H{
			"id":            user.ID,
			"email":         user.Email,
			"name":          user.Name,
			"username":      user.Username,
			"avatar":        user.Avatar,
			"role":          user.Role,
			"permissions":   user.GetEffectivePermissions(),
			"emailVerified": user.EmailVerified,
			"createdAt":     user.CreatedAt,
			"lastLogin":     nil,
			"totalXP":       user.TotalXP,
			"level":         user.Level,
			"currentStreak": 0,
			"_count": gin.H{
				"tasks":         0,
				"studySessions": 0,
				"achievements":  0,
			},
		})
	}

	api_response.List(c, items, api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: calculateTotalPages(total, limit),
	}, gin.H{
		"users": items,
		"summary": gin.H{
			"totalUsers":  total,
			"totalAdmins": totalAdmins,
			"powerUsers":  powerUsers,
		},
	})
}

func UpdateUser(c *gin.Context) {
	var req struct {
		UserID        string   `json:"userId"`
		ID            string   `json:"id"`
		Permissions   []string `json:"permissions"`
		Role          string   `json:"role"`
		Name          *string  `json:"name"`
		Username      *string  `json:"username"`
		Email         *string  `json:"email"`
		Phone         *string  `json:"phone"`
		Bio           *string  `json:"bio"`
		GradeLevel    *string  `json:"gradeLevel"`
		EducationType *string  `json:"educationType"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	userID := req.UserID
	if userID == "" {
		userID = req.ID
	}
	if userID == "" {
		userID = c.Param("id")
	}
	if userID == "" {
		api_response.Error(c, http.StatusBadRequest, "userId is required")
		return
	}

	var user models.User
	if err := db.DB.First(&user, idQuery, userID).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, errUserNotFound)
		return
	}

	type userUpdates struct {
		Role          *string               `gorm:"column:role"`
		Name          *string               `gorm:"column:name"`
		Username      *string               `gorm:"column:username"`
		Email         *string               `gorm:"column:email"`
		Phone         *string               `gorm:"column:phone"`
		Bio           *string               `gorm:"column:bio"`
		GradeLevel    *string               `gorm:"column:gradeLevel"`
		EducationType *string               `gorm:"column:educationType"`
		Permissions   models.JSONStringArray `gorm:"column:permissions"`
	}

	updates := userUpdates{
		Name:          req.Name,
		Username:      req.Username,
		Email:         req.Email,
		Phone:         req.Phone,
		Bio:           req.Bio,
		GradeLevel:    req.GradeLevel,
		EducationType: req.EducationType,
	}

	if req.Role != "" {
		updates.Role = &req.Role
	}
	if req.Permissions != nil {
		updates.Permissions = models.JSONStringArray(req.Permissions)
	}

	if err := db.DB.Model(&models.User{}).Where(idQuery, user.ID).
		Updates(&updates).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update user")
		return
	}

	db.DB.First(&user, idQuery, user.ID)
	_ = getUserRepo().Update(&user)

	LogAudit(c, "UPDATE", "user", user.ID, updates)
	api_response.Success(c, gin.H{"user": user})
}

func GetGuestUser(c *gin.Context) {
	api_response.Success(c, gin.H{"id": "guest_" + config.Load().Environment})
}

func GetUserByID(c *gin.Context) {
	id := c.Param("id")

	user, err := getUserRepo().FindByID(id)
	if err != nil {
		api_response.Error(c, http.StatusNotFound, errUserNotFound)
		return
	}

	api_response.Success(c, buildUserDetailsPayload(*user))
}

func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		userID = c.Query("userId")
	}
	if userID == "" {
		var input struct {
			ID     string `json:"id"`
			UserID string `json:"userId"`
		}
		_ = c.ShouldBindJSON(&input)
		if input.UserID != "" {
			userID = input.UserID
		} else {
			userID = input.ID
		}
	}
	if userID == "" {
		api_response.Error(c, http.StatusBadRequest, "userId is required")
		return
	}

	if err := db.DB.Delete(&models.User{}, idQuery, userID).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete user")
		return
	}

	LogAudit(c, "DELETE", "user", userID, nil)
	api_response.Success(c, nil)
}

func CreateUser(c *gin.Context) {
	var input struct {
		Email    string  `json:"email" binding:"required,email"`
		Name     *string `json:"name"`
		Username *string `json:"username"`
		Role     string  `json:"role"`
		Phone    *string `json:"phone"`
		Password string  `json:"password"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	role := models.RoleStudent
	if input.Role != "" {
		validRoles := map[string]bool{"STUDENT": true, "TEACHER": true, "MODERATOR": true, "ADMIN": true}
		if !validRoles[input.Role] {
			api_response.Error(c, http.StatusBadRequest, "Invalid role")
			return
		}
		role = models.UserRole(input.Role)
	}

	password := input.Password
	if password == "" {
		b := make([]byte, 16)
		_, _ = cryptoRand.Read(b)
		password = hex.EncodeToString(b)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	user := models.User{
		Email:        input.Email,
		Name:         input.Name,
		Username:     input.Username,
		Role:         role,
		Phone:        input.Phone,
		PasswordHash: string(hashedPassword),
	}

	if err := db.DB.Create(&user).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create user")
		return
	}

	LogAudit(c, "CREATE", "user", user.ID, user)
	api_response.Created(c, user)
}

func buildUserDetailsPayload(user models.User) gin.H {
	var tasksCompleted int64
	var totalTasks int64
	var totalStudySessions int64
	var totalStudyTime int64
	var examsPassed int64
	var examResultsCount int64
	var unreadNotifications int64
	var totalEnrollments int64
	var achievementsCount int64

	db.DB.Model(&models.Task{}).Where("user_id = ? AND status = ?", user.ID, models.TaskCompleted).Count(&tasksCompleted)
	db.DB.Model(&models.Task{}).Where(userIDQuery, user.ID).Count(&totalTasks)
	db.DB.Model(&models.StudySession{}).Where(userIDQuery, user.ID).Count(&totalStudySessions)
	db.DB.Model(&models.StudySession{}).Where(userIDQuery, user.ID).Select("COALESCE(SUM(duration_min), 0)").Scan(&totalStudyTime)
	db.DB.Model(&models.ExamResult{}).Where("user_id = ? AND passed = ?", user.ID, true).Count(&examsPassed)
	db.DB.Model(&models.ExamResult{}).Where(userIDQuery, user.ID).Count(&examResultsCount)
	db.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", user.ID, false).Count(&unreadNotifications)
	db.DB.Model(&models.Enrollment{}).Where(userIDQuery, user.ID).Count(&totalEnrollments)

	return gin.H{
		"id":                 user.ID,
		"email":              user.Email,
		"name":               user.Name,
		"username":           user.Username,
		"avatar":             user.Avatar,
		"role":               user.Role,
		"emailVerified":      user.EmailVerified,
		"phone":              user.Phone,
		"phoneVerified":      user.PhoneVerified,
		"twoFactorEnabled":   false,
		"createdAt":          user.CreatedAt,
		"updatedAt":          user.UpdatedAt,
		"lastLogin":          nil,
		"totalXP":            user.TotalXP,
		"level":              user.Level,
		"currentStreak":      0,
		"longestStreak":      0,
		"totalStudyTime":     totalStudyTime,
		"tasksCompleted":     tasksCompleted,
		"examsPassed":        examsPassed,
		"pomodoroSessions":   0,
		"deepWorkSessions":   0,
		"studyXP":            0,
		"taskXP":             0,
		"examXP":             0,
		"challengeXP":        0,
		"questXP":            0,
		"seasonXP":           0,
		"gradeLevel":         user.GradeLevel,
		"educationType":      user.EducationType,
		"section":            user.Section,
		"interestedSubjects": []string{},
		"studyGoal":          nil,
		"bio":                user.Bio,
		"school":             nil,
		"country":            user.Country,
		"dateOfBirth":        nil,
		"gender":             nil,
		"_count": gin.H{
			"tasks":              totalTasks,
			"studySessions":      totalStudySessions,
			"achievements":       achievementsCount,
			"notifications":      unreadNotifications,
			"examResults":        examResultsCount,
			"subjectEnrollments": totalEnrollments,
			"customGoals":        0,
			"reminders":          0,
			"sessions":           0,
		},
		"achievements":  []interface{}{},
		"examResults":   []interface{}{},
		"studySessions": []interface{}{},
	}
}

func UpdateProfile(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Name          string `json:"name"`
		Username      string `json:"username"`
		Phone         string `json:"phone"`
		Bio           string `json:"bio"`
		GradeLevel    string `json:"gradeLevel"`
		EducationType string `json:"educationType"`
		Section       string `json:"section"`
		Country       string `json:"country"`
		City          string `json:"city"`
		Avatar        string `json:"avatar"`
		BirthDate     string `json:"birthDate"`
		Gender        string `json:"gender"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := db.DB.First(&user, idQuery, userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errUserNotFound})
		return
	}

	type profileUpdates struct {
		Name          *string `gorm:"column:name"`
		Username      *string `gorm:"column:username"`
		Phone         *string `gorm:"column:phone"`
		Bio           *string `gorm:"column:bio"`
		GradeLevel    *string `gorm:"column:gradeLevel"`
		EducationType *string `gorm:"column:educationType"`
		Section       *string `gorm:"column:section"`
		Country       *string `gorm:"column:country"`
		Avatar        *string `gorm:"column:avatar"`
		Gender        *string `gorm:"column:gender"`
	}

	updates := profileUpdates{}
	if req.Name != "" { updates.Name = &req.Name }
	if req.Username != "" { updates.Username = &req.Username }
	if req.Phone != "" { updates.Phone = &req.Phone }
	if req.Bio != "" { updates.Bio = &req.Bio }
	if req.GradeLevel != "" { updates.GradeLevel = &req.GradeLevel }
	if req.EducationType != "" { updates.EducationType = &req.EducationType }
	if req.Section != "" { updates.Section = &req.Section }
	if req.Country != "" { updates.Country = &req.Country }
	if req.Avatar != "" { updates.Avatar = &req.Avatar }
	if req.Gender != "" { updates.Gender = &req.Gender }

	if err := db.DB.Model(&models.User{}).Where(idQuery, user.ID).
		Updates(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	db.DB.First(&user, idQuery, user.ID)
	_ = getUserRepo().Update(&user)

	c.JSON(http.StatusOK, gin.H{"success": true, "user": user})
}

func GetBillingSummary(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := getUserRepo().FindByID(userId.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errUserNotFound})
		return
	}

	var payments []models.Payment
	db.DB.Where(userIDQuery, user.ID).Order("created_at desc").Limit(20).Find(&payments)

	var totalSpent float64
	var successCount int64
	var pendingCount int64
	var failedCount int64

	for _, p := range payments {
		switch p.Status {
		case models.PaymentCompleted:
			totalSpent += p.Amount
			successCount++
		case models.PaymentPending:
			pendingCount++
		default:
			failedCount++
		}
	}

	var activeSub models.UserSubscription
	var activeSubscriptionData interface{}
	if err := db.DB.Preload("Plan").Where("user_id = ? AND status = ? AND end_date > ?", user.ID, models.SubscriptionActive, time.Now()).First(&activeSub).Error; err == nil {
		activeSubscriptionData = gin.H{
			"id":        activeSub.ID,
			"status":    activeSub.Status,
			"startDate": activeSub.StartDate,
			"endDate":   activeSub.EndDate,
			"plan": gin.H{
				"id":     activeSub.Plan.ID,
				"name":   activeSub.Plan.Name,
				"nameAr": activeSub.Plan.NameAr,
				"price":  activeSub.Plan.Price,
			},
			"payments": []gin.H{},
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"name":                  stringOrEmpty(user.Name),
		"email":                 user.Email,
		"balance":               user.Balance,
		"additionalAiCredits":   user.AiCredits,
		"additionalExamCredits": user.ExamCredits,
		"activeSubscription":    activeSubscriptionData,
		"paymentHistory":        payments,
		"stats": gin.H{
			"totalSpent":   totalSpent,
			"paymentCount": len(payments),
			"successCount": successCount,
			"pendingCount": pendingCount,
			"failedCount":  failedCount,
		},
	})
}

func calculateTotalPages(total int64, limit int) int64 {
	if limit <= 0 {
		return 1
	}
	pages := total / int64(limit)
	if total%int64(limit) != 0 {
		pages++
	}
	if pages == 0 {
		return 1
	}
	return pages
}

func defaultPermissions(role models.UserRole, existing []string) []string {
	if len(existing) > 0 {
		return existing
	}
	return models.GetDefaultPermissions(role)
}

func ClerkWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	if err := verifyWebhookHeaders(c, body); err != nil {
		return
	}

	event, err := parseClerkEvent(body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("[Clerk Webhook] Received event: %s", sanitizeLog(event.Type))
	dispatchClerkEvent(event)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

type clerkEvent struct {
	Type string                 `json:"type"`
	Data map[string]interface{} `json:"data"`
}

func parseClerkEvent(body []byte) (clerkEvent, error) {
	var event clerkEvent
	if err := json.Unmarshal(body, &event); err != nil {
		return event, fmt.Errorf("Invalid JSON payload")
	}
	return event, nil
}

func dispatchClerkEvent(event clerkEvent) {
	switch event.Type {
	case "user.created", "user.updated":
		if err := syncUserFromClerk(event.Data); err != nil {
			log.Printf("[Clerk Webhook] Error syncing user: %v", err)
		}
	case "user.deleted":
		if userId, ok := event.Data["id"].(string); ok {
			if err := db.DB.Where(idQuery, userId).Delete(&models.User{}).Error; err != nil {
				log.Printf("[Clerk Webhook] Error deleting user: %v", err)
			}
		}
	default:
		log.Printf("[Clerk Webhook] Unhandled event type: %s", sanitizeLog(event.Type))
	}
}

func verifyWebhookHeaders(c *gin.Context, body []byte) error {
	svixID := c.GetHeader("svix-id")
	svixTimestamp := c.GetHeader("svix-timestamp")
	svixSignature := c.GetHeader("svix-signature")

	if svixID == "" || svixTimestamp == "" || svixSignature == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing Svix webhook headers"})
		return fmt.Errorf("missing headers")
	}

	if err := verifyWebhookTimestamp(svixTimestamp); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return err
	}

	return verifyWebhookSignature(c, body, svixID, svixTimestamp, svixSignature)
}

func verifyWebhookTimestamp(svixTimestamp string) error {
	ts, err := strconv.ParseInt(svixTimestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("Invalid svix-timestamp")
	}
	if time.Now().Unix()-ts > 300 {
		return fmt.Errorf("Webhook timestamp too old")
	}
	return nil
}

func verifyWebhookSignature(c *gin.Context, body []byte, svixID, svixTimestamp, svixSignature string) error {
	secret := config.Load().ClerkWebhookSecret
	if secret == "" {
		log.Println("[Clerk Webhook] WARNING: CLERK_WEBHOOK_SECRET not set, skipping verification")
		return nil
	}

	signedContent := svixID + "." + svixTimestamp + "." + string(body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signedContent))
	expected := mac.Sum(nil)

	for _, sig := range strings.Split(svixSignature, " ") {
		parts := strings.SplitN(sig, ",", 2)
		if len(parts) != 2 || parts[0] != "v1" {
			continue
		}
		got, err := base64.StdEncoding.DecodeString(parts[1])
		if err != nil {
			continue
		}
		if hmac.Equal(expected, got) {
			return nil
		}
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid webhook signature"})
	return fmt.Errorf("invalid signature")
}

func syncUserFromClerk(clerkData map[string]interface{}) error {
	userId, ok := clerkData["id"].(string)
	if !ok {
		return nil
	}

	email, _ := clerkData["email_addresses"].([]interface{})
	var primaryEmail string
	if len(email) > 0 {
		if emailObj, ok := email[0].(map[string]interface{}); ok {
			if emailAddress, ok := emailObj["email_address"].(string); ok {
				primaryEmail = emailAddress
			}
		}
	}

	if primaryEmail == "" {
		return nil
	}

	firstName, _ := clerkData["first_name"].(string)
	lastName, _ := clerkData["last_name"].(string)
	name := firstName
	if lastName != "" {
		name += " " + lastName
	}

	user := models.User{
		ID:            userId,
		Email:         primaryEmail,
		EmailVerified: true,
		Status:        models.StatusActive,
		Role:          models.RoleStudent,
		Balance:       0,
		AiCredits:     0,
		ExamCredits:   0,
		TotalXP:       0,
		Level:         1,
	}

	if name != "" {
		user.Name = &name
	}

	result := db.DB.Clauses(
		clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			UpdateAll: true,
		},
	).Create(&user)

	if result.Error != nil {
		log.Printf("[Clerk Webhook] Error creating user: %v", result.Error)
		return result.Error
	}

	log.Printf("[Clerk Webhook] User synced successfully: %s (%s)", sanitizeLog(userId), sanitizeLog(primaryEmail))
	return nil
}

func EnsureUserExists(userId string, email string) error {
	var user models.User
	err := db.DB.First(&user, idQuery, userId).Error

	if err == nil {
		return nil
	}

	newUser := models.User{
		ID:            userId,
		Email:         email,
		EmailVerified: false,
		Status:        models.StatusActive,
		Role:          models.RoleStudent,
		Balance:       0,
		AiCredits:     0,
		ExamCredits:   0,
		TotalXP:       0,
		Level:         1,
	}

	if err := db.DB.Create(&newUser).Error; err != nil {
		return err
	}

	log.Printf("[Auth] Auto-created user: %s (%s)", sanitizeLog(userId), sanitizeLog(email))
	return nil
}

func sanitizeLog(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "\n", ""), "\r", "")
}
