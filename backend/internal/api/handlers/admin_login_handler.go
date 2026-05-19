package handlers

import (
	"net/http"
	"strings"
	"time"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"

	"github.com/gin-gonic/gin"
)

// AdminLogin handles authentication exclusively for ADMIN and MODERATOR roles.
// It rejects any user whose role is not ADMIN or MODERATOR, even if credentials are valid.
//
// @Summary      Admin panel login
// @Description  Authenticate with admin/moderator credentials. Returns 403 for non-staff roles.
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request body LoginRequest true "Login credentials"
// @Success      200 {object} map[string]interface{} "Login successful"
// @Failure      401 {object} map[string]interface{} "Invalid credentials"
// @Failure      403 {object} map[string]interface{} "Insufficient role"
// @Failure      429 {object} map[string]interface{} "Too many attempts"
// @Router       /auth/admin-login [post]
func AdminLogin(c *gin.Context) {
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
		services.GetAuditService().LogAsync("", services.AuditEventLoginFailed, "admin-auth", email, map[string]interface{}{"error": err.Error(), "panel": "admin"}, ip, userAgent)
		_ = LogSecurityEvent("", models.SecurityEventLoginFailed, ip, userAgent, nil, nil)
		// Generic error to prevent user enumeration
		c.JSON(http.StatusUnauthorized, gin.H{"error": "البريد الإلكتروني أو كلمة المرور غير صحيحة"})
		return
	}

	// ── Role guard ──────────────────────────────────────────────────────────
	// Only ADMIN and MODERATOR are allowed to access the admin panel.
	if user.Role != models.RoleAdmin && user.Role != models.RoleModerator {
		recordLoginAttempt(c, email, ip, false)
		services.GetAuditService().LogAsync(user.ID, "admin.unauthorized_access_attempt", "admin-auth", user.ID, map[string]interface{}{"role": user.Role, "panel": "admin"}, ip, userAgent)
		_ = LogSecurityEvent(user.ID, models.SecurityEventLoginFailed, ip, userAgent, nil, nil)
		c.JSON(http.StatusForbidden, gin.H{"error": "ليس لديك صلاحيات الوصول إلى لوحة التحكم"})
		return
	}
	// ────────────────────────────────────────────────────────────────────────

	recordLoginAttempt(c, email, ip, true)

	// 2FA flow - return early without tokens
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
	services.GetAuditService().LogAsync(user.ID, services.AuditEventLogin, "admin-auth", user.ID, map[string]interface{}{"ip": ip, "panel": "admin"}, ip, userAgent)

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
