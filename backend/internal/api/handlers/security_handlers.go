package handlers

import (
	"crypto/rand"
	"encoding/base32"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pquerna/otp/totp"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

const errInvalidVerificationCode = "Invalid verification code"

// ========== 2FA Handlers ==========

// GetTwoFactorStatus returns the 2FA status for the current user
// @Summary Get 2FA status
// @Description Get two-factor authentication status
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/2fa/status [get]
func GetTwoFactorStatus(c *gin.Context) {
	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		// No settings found, return disabled status
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"isEnabled":  false,
				"method":     nil,
				"isEnforced": false,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"isEnabled":       settings.IsEnabled,
			"method":          settings.Method,
			"lastUsedAt":      settings.LastUsedAt,
			"isEnforced":      settings.IsEnforced,
			"verifiedDevices": settings.VerifiedDevices,
		},
	})
}

// InitiateTwoFactorSetup starts the 2FA setup process
// @Summary Initiate 2FA setup
// @Description Start setting up two-factor authentication
// @Tags admin,security
// @Accept json
// @Produce json
// @Param request body map[string]string true "Setup method"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/2fa/setup [post]
func InitiateTwoFactorSetup(c *gin.Context) {
	var req struct {
		Method string `json:"method" binding:"required,oneof=authenticator sms email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userId")
	userEmail, _ := c.Get("user_email")
	userPhone, _ := c.Get("user_phone")

	var response gin.H

	switch req.Method {
	case "authenticator":
		// Generate TOTP secret
		secret := make([]byte, 20)
		rand.Read(secret)
		secretKey := base32.StdEncoding.EncodeToString(secret)

		// Generate QR code URL
		qrURL := fmt.Sprintf("otpauth://totp/Thanawy%%20Admin:%s?secret=%s&issuer=Thanawy%%20Admin", userEmail.(string), secretKey)

		response = gin.H{
			"secret": secretKey,
			"qrCode": qrURL,
		}

		// Store pending setup
		settings := models.TwoFactorSettings{
			UserID:       userID.(string),
			Method:       "authenticator",
			Secret:       secretKey,
			IsEnabled:    false, // Not enabled until verified
			PendingSetup: true,
			CreatedAt:    time.Now(),
		}
		db.DB.Where(userIDQuery, userID).Assign(settings).FirstOrCreate(&settings)

	case "sms":
		if userPhone == nil || userPhone == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number not available"})
			return
		}
		response = gin.H{
			"phoneNumber": userPhone,
			"message":     "Verification code sent via SMS",
		}

	case "email":
		response = gin.H{
			"email":   userEmail,
			"message": "Verification code sent via email",
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": response})
}

// VerifyTwoFactor verifies the 2FA code and activates it
// @Summary Verify and activate 2FA
// @Description Verify the 2FA code and activate two-factor authentication
// @Tags admin,security
// @Accept json
// @Produce json
// @Param request body map[string]string true "Verification code"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/2fa/verify [post]
func VerifyTwoFactor(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No pending 2FA setup found"})
		return
	}

	// Verify TOTP code
	if settings.Method == "authenticator" {
		valid := totp.Validate(req.Code, settings.Secret)
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidVerificationCode})
			return
		}
	}

	// Generate backup codes
	backupCodes := generateBackupCodes(10)

	// Enable 2FA
	settings.IsEnabled = true
	settings.PendingSetup = false
	settings.BackupCodes = backupCodes
	now := time.Now()
	settings.ActivatedAt = &now
	db.DB.Save(&settings)

	// Log
	middleware.LogCriticalOperation(c, "2fa_activated", map[string]interface{}{
		"method": settings.Method,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "2FA activated successfully",
		"data": gin.H{
			"backupCodes": backupCodes,
		},
	})
}

// DisableTwoFactor disables 2FA for the user
// @Summary Disable 2FA
// @Description Disable two-factor authentication
// @Tags admin,security
// @Accept json
// @Produce json
// @Param request body map[string]string true "Verification code"
// @Success 200 {object} map[string]string
// @Router /api/admin/security/2fa/disable [post]
func DisableTwoFactor(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA not enabled"})
		return
	}

	// Verify code before disabling
	if settings.Method == "authenticator" {
		valid := totp.Validate(req.Code, settings.Secret)
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidVerificationCode})
			return
		}
	}

	settings.IsEnabled = false
	now := time.Now()
	settings.DeactivatedAt = &now
	db.DB.Save(&settings)

	middleware.LogCriticalOperation(c, "2fa_disabled", nil)

	c.JSON(http.StatusOK, gin.H{"message": "2FA disabled successfully"})
}

// RegenerateBackupCodes generates new backup codes
// @Summary Regenerate backup codes
// @Description Generate new backup codes for 2FA
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/2fa/backup-codes [post]
func RegenerateBackupCodes(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA not enabled"})
		return
	}

	// Verify code
	if settings.Method == "authenticator" {
		valid := totp.Validate(req.Code, settings.Secret)
		if !valid {
			c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidVerificationCode})
			return
		}
	}

	backupCodes := generateBackupCodes(10)
	settings.BackupCodes = backupCodes
	db.DB.Save(&settings)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"backupCodes": backupCodes,
		},
	})
}

// ========== Session Management Handlers ==========

// GetActiveSessions returns all active sessions
// @Summary Get active sessions
// @Description Get all active sessions for the current user or all users (admin)
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/sessions [get]
func GetActiveSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	isAdmin := c.GetBool("is_admin")

	query := db.DB.Model(&models.UserSession{}).Where(statusQuery, "active")

	// Regular users can only see their own sessions
	if !isAdmin {
		query = query.Where(userIDQuery, userID)
	}

	var sessions []models.UserSession
	if err := query.Order("last_active_at DESC").Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sessions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"sessions": sessions,
			"count":    len(sessions),
		},
	})
}

// RevokeSession revokes a specific session
// @Summary Revoke session
// @Description Revoke/end a specific session
// @Tags admin,security
// @Accept json
// @Produce json
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/security/sessions/{id}/revoke [post]
func RevokeSession(c *gin.Context) {
	sessionID := c.Param("id")
	adminID, _ := c.Get("userId")

	var session models.UserSession
	if err := db.DB.First(&session, idQuery, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	session.Status = "revoked"
	now := time.Now()
	session.RevokedAt = &now
	adminIDStr := adminID.(string)
	session.RevokedBy = &adminIDStr

	if err := db.DB.Save(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to revoke session"})
		return
	}

	middleware.LogCriticalOperation(c, "session_revoked", map[string]interface{}{
		"session_id": sessionID,
		"user_id":    session.UserID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Session revoked successfully"})
}

// RevokeOtherSessions revokes all sessions except current
// @Summary Revoke other sessions
// @Description Revoke all other sessions except the current one
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/sessions/revoke-others [post]
func RevokeOtherSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	currentSessionID := c.GetString("session_id")

	result := db.DB.Model(&models.UserSession{}).
		Where("user_id = ? AND id != ? AND status = ?", userID, currentSessionID, "active").
		Updates(map[string]interface{}{
			"status":     "revoked",
			"revoked_at": time.Now(),
			"revoked_by": userID,
		})

	middleware.LogCriticalOperation(c, "sessions_revoked_others", map[string]interface{}{
		"revoked_count": result.RowsAffected,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "Other sessions revoked",
		"data": gin.H{
			"revokedCount": result.RowsAffected,
		},
	})
}

// RevokeUserSessions revokes all sessions for a specific user
// @Summary Revoke user sessions
// @Description Revoke all sessions for a specific user (admin only)
// @Tags admin,security
// @Accept json
// @Produce json
// @Param userId path string true "User ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/sessions/user/{userId}/revoke-all [post]
func RevokeUserSessions(c *gin.Context) {
	userID := c.Param("userId")
	adminID, _ := c.Get("userId")

	result := db.DB.Model(&models.UserSession{}).
		Where("user_id = ? AND status = ?", userID, "active").
		Updates(map[string]interface{}{
			"status":     "revoked",
			"revoked_at": time.Now(),
			"revoked_by": adminID,
		})

	middleware.LogCriticalOperation(c, "user_sessions_revoked", map[string]interface{}{
		"target_user":   userID,
		"revoked_count": result.RowsAffected,
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "All user sessions revoked",
		"data": gin.H{
			"revokedCount": result.RowsAffected,
		},
	})
}

// GetSessionStats returns session statistics
// @Summary Get session statistics
// @Description Get statistics about user sessions
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/sessions/stats [get]
func GetSessionStats(c *gin.Context) {
	var stats struct {
		TotalActive   int64 `json:"totalActive"`
		TotalExpired  int64 `json:"totalExpired"`
		UniqueDevices int64 `json:"uniqueDevices"`
	}

	db.DB.Model(&models.UserSession{}).Where(statusQuery, "active").Count(&stats.TotalActive)
	db.DB.Model(&models.UserSession{}).Where(statusQuery, "expired").Count(&stats.TotalExpired)
	db.DB.Model(&models.UserSession{}).Where(statusQuery, "active").Select("COUNT(DISTINCT device_id)").Scan(&stats.UniqueDevices)

	c.JSON(http.StatusOK, gin.H{
		"data": stats,
	})
}

// ========== IP Whitelist Handlers ==========

// GetIPWhitelist returns all whitelist entries
// @Summary Get IP whitelist
// @Description Get all IP whitelist entries
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/ip-whitelist [get]
func GetIPWhitelist(c *gin.Context) {
	var entries []models.IPWhitelistEntry
	if err := db.DB.Order("created_at DESC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch whitelist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"entries": entries,
		},
	})
}

// AddIPToWhitelist adds an IP to the whitelist
// @Summary Add IP to whitelist
// @Description Add an IP address to the whitelist
// @Tags admin,security
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "IP details"
// @Success 201 {object} map[string]interface{}
// @Router /api/admin/security/ip-whitelist [post]
func AddIPToWhitelist(c *gin.Context) {
	var req struct {
		IPAddress   string    `json:"ipAddress" binding:"required,ip"`
		CIDR        string    `json:"cidr,omitempty"`
		Description string    `json:"description,omitempty"`
		Type        string    `json:"type" binding:"required,oneof=admin api webhook"`
		ExpiresAt   time.Time `json:"expiresAt,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, _ := c.Get("userId")

	entry := models.IPWhitelistEntry{
		IPAddress:   req.IPAddress,
		CIDR:        req.CIDR,
		Description: req.Description,
		Type:        req.Type,
		Status:      "active",
		IsTemporary: !req.ExpiresAt.IsZero(),
		ExpiresAt:   &req.ExpiresAt,
		CreatedBy:   adminID.(string),
		CreatedAt:   time.Now(),
	}

	if err := SafeCreate(db.DB, &entry); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add IP"})
		return
	}

	middleware.LogCriticalOperation(c, "ip_whitelist_added", map[string]interface{}{
		"ip":   req.IPAddress,
		"type": req.Type,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message": "IP added to whitelist",
		"data":    entry,
	})
}

// RemoveIPFromWhitelist removes an IP from the whitelist
// @Summary Remove IP from whitelist
// @Description Remove an IP address from the whitelist
// @Tags admin,security
// @Accept json
// @Produce json
// @Param id path string true "Entry ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/security/ip-whitelist/{id} [delete]
func RemoveIPFromWhitelist(c *gin.Context) {
	id := c.Param("id")

	var entry models.IPWhitelistEntry
	if err := db.DB.First(&entry, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entry not found"})
		return
	}

	if err := db.DB.Delete(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove IP"})
		return
	}

	middleware.LogCriticalOperation(c, "ip_whitelist_removed", map[string]interface{}{
		"ip": entry.IPAddress,
	})

	c.JSON(http.StatusOK, gin.H{"message": "IP removed from whitelist"})
}

// GetIPWhitelistSettings returns whitelist settings
// @Summary Get whitelist settings
// @Description Get IP whitelist configuration settings
// @Tags admin,security
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/security/ip-whitelist/settings [get]
func GetIPWhitelistSettings(c *gin.Context) {
	var settings models.IPWhitelistSettings
	if err := db.DB.First(&settings).Error; err != nil {
		// Return defaults
		c.JSON(http.StatusOK, gin.H{
			"data": gin.H{
				"isEnabled":          false,
				"enforceForAdmins":   false,
				"enforceForAPI":      false,
				"defaultAction":      "allow",
				"allowInternalIPs":   true,
				"internalIPRanges":   config.GlobalConfig.InternalIPRanges,
				"logBlockedAttempts": true,
				"notifyOnViolation":  true,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": settings})
}

// UpdateIPWhitelistSettings updates whitelist settings
// @Summary Update whitelist settings
// @Description Update IP whitelist configuration
// @Tags admin,security
// @Accept json
// @Produce json
// @Param request body map[string]interface{} true "Settings"
// @Success 200 {object} map[string]string
// @Router /api/admin/security/ip-whitelist/settings [patch]
func UpdateIPWhitelistSettings(c *gin.Context) {
	var req models.IPWhitelistSettings
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.IPWhitelistSettings
	if err := db.DB.First(&existing).Error; err != nil {
		// Create new
		req.ID = "default"
		SafeCreate(db.DB, &req)
	} else {
		type whitelistSettingsUpdates struct {
			IsEnabled          *bool   `gorm:"column:is_enabled"`
			EnforceForAdmins   *bool   `gorm:"column:enforce_for_admins"`
			EnforceForAPI      *bool   `gorm:"column:enforce_for_api"`
			DefaultAction      *string `gorm:"column:default_action"`
			AllowInternalIPs   *bool   `gorm:"column:allow_internal_ips"`
			LogBlockedAttempts *bool   `gorm:"column:log_blocked_attempts"`
			NotifyOnViolation  *bool   `gorm:"column:notify_on_violation"`
		}
		updates := whitelistSettingsUpdates{
			IsEnabled:          &req.IsEnabled,
			EnforceForAdmins:   &req.EnforceForAdmins,
			EnforceForAPI:      &req.EnforceForAPI,
			DefaultAction:      &req.DefaultAction,
			AllowInternalIPs:   &req.AllowInternalIPs,
			LogBlockedAttempts: &req.LogBlockedAttempts,
			NotifyOnViolation:  &req.NotifyOnViolation,
		}
		db.DB.Model(&models.IPWhitelistSettings{}).Where(idQuery, existing.ID).
			Updates(&updates)
	}

	middleware.LogCriticalOperation(c, "ip_whitelist_settings_updated", nil)

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

// UpdateIPWhitelistEntry updates fields on an existing whitelist entry (PATCH :id).
func UpdateIPWhitelistEntry(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Description *string `json:"description"`
		Status      *string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Description == nil && req.Status == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	var entry models.IPWhitelistEntry
	if err := db.DB.First(&entry, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Entry not found"})
		return
	}

	type entryUpdates struct {
		Description *string `gorm:"column:description"`
		Status      *string `gorm:"column:status"`
	}

	updates := entryUpdates{
		Description: req.Description,
		Status:      req.Status,
	}

	if err := db.DB.Model(&models.IPWhitelistEntry{}).Where(idQuery, entry.ID).
		Updates(&updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update entry"})
		return
	}
	_ = db.DB.First(&entry, idQuery, id)
	middleware.LogCriticalOperation(c, "ip_whitelist_updated", map[string]interface{}{"id": id})
	c.JSON(http.StatusOK, gin.H{"message": "Entry updated", "data": entry})
}

// BulkAddIPToWhitelist creates multiple whitelist entries in one request.
func BulkAddIPToWhitelist(c *gin.Context) {
	var req struct {
		IPAddresses []string `json:"ipAddresses" binding:"required"`
		Description string   `json:"description,omitempty"`
		Type        string   `json:"type" binding:"required,oneof=admin api webhook"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminIDVal, ok := c.Get("userId")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	adminID, ok := adminIDVal.(string)
	if !ok || adminID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tx := db.DB.Begin()
	added := 0
	for _, raw := range req.IPAddresses {
		ip := raw
		if parsed := net.ParseIP(ip); parsed == nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid IP address: " + raw})
			return
		}
		entry := models.IPWhitelistEntry{
			IPAddress:   ip,
			Description: req.Description,
			Type:        req.Type,
			Status:      "active",
			CreatedBy:   adminID,
			CreatedAt:   time.Now(),
		}
		if err := tx.Create(&entry).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add IP: " + ip})
			return
		}
		added++
	}
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit bulk add"})
		return
	}

	middleware.LogCriticalOperation(c, "ip_whitelist_bulk_added", map[string]interface{}{"count": added})
	c.JSON(http.StatusCreated, gin.H{"message": "IPs added", "added": added})
}

// CheckIPWhitelist reports whether an exact IP exists as an active whitelist entry.
func CheckIPWhitelist(c *gin.Context) {
	ip := c.Query("ip")
	if ip == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "IP required"})
		return
	}
	if net.ParseIP(ip) == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid IP"})
		return
	}
	var count int64
	if err := db.DB.Model(&models.IPWhitelistEntry{}).
		Where("ip_address = ? AND status = ?", ip, "active").
		Count(&count).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check whitelist"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"isWhitelisted": count > 0})
}

// GetBlockedAttempts returns recent blocked IP attempts (if table is populated).
func GetBlockedAttempts(c *gin.Context) {
	var attempts []models.BlockedIPAttempt
	if err := db.DB.Order("attempted_at DESC").Limit(200).Find(&attempts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch blocked attempts"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{"attempts": attempts}})
}

// VerifyTwoFactorLogin validates a TOTP code for the authenticated user (challengeId reserved for future login flows).
func VerifyTwoFactorLogin(c *gin.Context) {
	var req struct {
		ChallengeID string `json:"challengeId" binding:"required"`
		Code        string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDVal, ok := c.Get("userId")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID, ok := userIDVal.(string)
	if !ok || userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA not configured"})
		return
	}
	if settings.Method == "authenticator" && settings.Secret != "" {
		if !totp.Validate(req.Code, settings.Secret) {
			c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidVerificationCode})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "challengeId": req.ChallengeID})
}

// GetUser2FAStatus returns the 2FA status for the authenticated user
func GetUser2FAStatus(c *gin.Context) {
	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{
			"enabled": false,
			"data": gin.H{
				"isEnabled":  false,
				"method":     nil,
				"isEnforced": false,
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"enabled": settings.IsEnabled,
		"data": gin.H{
			"isEnabled":       settings.IsEnabled,
			"method":          settings.Method,
			"lastUsedAt":      settings.LastUsedAt,
			"isEnforced":      settings.IsEnforced,
			"verifiedDevices": settings.VerifiedDevices,
		},
	})
}

// InitiateUser2FASetup generates TOTP secret and QR code image URL for the authenticated user
func InitiateUser2FASetup(c *gin.Context) {
	userID, _ := c.Get("userId")

	var user models.User
	if err := db.DB.First(&user, idQuery, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Generate TOTP secret
	secret := make([]byte, 20)
	rand.Read(secret)
	secretKey := base32.StdEncoding.EncodeToString(secret)

	// URL-encode the otpauth URL for the QR code api
	otpAuthURL := fmt.Sprintf("otpauth://totp/Thanawy:%s?secret=%s&issuer=Thanawy", user.Email, secretKey)
	qrCodeImageURL := fmt.Sprintf("https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=%s", url.QueryEscape(otpAuthURL))

	// Store pending setup
	settings := models.TwoFactorSettings{
		UserID:       userID.(string),
		Method:       "authenticator",
		Secret:       secretKey,
		IsEnabled:    false, // Not enabled until verified
		PendingSetup: true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.DB.Where(userIDQuery, userID).Assign(settings).FirstOrCreate(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store pending 2FA setup"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"secret": secretKey,
		"qrCode": qrCodeImageURL,
	})
}

// EnableUser2FA verifies the 2FA token/code and enables it for the authenticated user
func EnableUser2FA(c *gin.Context) {
	var req struct {
		Secret string `json:"secret" binding:"required"`
		Token  string `json:"token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID, _ := c.Get("userId")

	// Verify TOTP code
	valid := totp.Validate(req.Token, req.Secret)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidVerificationCode})
		return
	}

	// Generate backup codes
	backupCodes := generateBackupCodes(10)

	tx := db.DB.Begin()

	var settings models.TwoFactorSettings
	err := tx.First(&settings, userIDQuery, userID).Error
	if err != nil {
		settings = models.TwoFactorSettings{
			UserID: userID.(string),
		}
	}

	now := time.Now()
	settings.Method = "authenticator"
	settings.Secret = req.Secret
	settings.IsEnabled = true
	settings.PendingSetup = false
	settings.BackupCodes = backupCodes
	settings.ActivatedAt = &now
	settings.UpdatedAt = now

	if err := tx.Save(&settings).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save 2FA settings"})
		return
	}

	if err := tx.Model(&models.User{}).Where(idQuery, userID).Updates(map[string]interface{}{
		"two_factor_enabled": true,
		"two_factor_secret":  req.Secret,
		"updated_at":         now,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable 2FA on user account"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	middleware.LogCriticalOperation(c, "2fa_activated", map[string]interface{}{
		"method": "authenticator",
	})

	c.JSON(http.StatusOK, gin.H{
		"message": "2FA activated successfully",
		"data": gin.H{
			"backupCodes": backupCodes,
		},
	})
}

// DisableUser2FA disables 2FA for the authenticated user without code verification
func DisableUser2FA(c *gin.Context) {
	userID, _ := c.Get("userId")

	var settings models.TwoFactorSettings
	if err := db.DB.First(&settings, userIDQuery, userID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "2FA not enabled"})
		return
	}

	tx := db.DB.Begin()

	settings.IsEnabled = false
	now := time.Now()
	settings.DeactivatedAt = &now
	settings.UpdatedAt = now
	if err := tx.Save(&settings).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable 2FA settings"})
		return
	}

	if err := tx.Model(&models.User{}).Where(idQuery, userID).Updates(map[string]interface{}{
		"two_factor_enabled": false,
		"two_factor_secret":  nil,
		"updated_at":         now,
	}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user account"})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	middleware.LogCriticalOperation(c, "2fa_disabled", nil)

	c.JSON(http.StatusOK, gin.H{"message": "2FA disabled successfully"})
}

// SendPhoneVerification handles POST /api/auth/verify-phone/send
func SendPhoneVerification(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Phone number is required"})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Clean/validate phone number (simple validation)
	if len(req.Phone) < 10 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid phone number format"})
		return
	}

	// Generate 6-digit OTP
	const digits = "0123456789"
	otpBytes := make([]byte, 6)
	if _, err := rand.Read(otpBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate verification code"})
		return
	}
	for i, b := range otpBytes {
		otpBytes[i] = digits[b%10]
	}
	otpCode := string(otpBytes)

	// Save to user model
	expiresAt := time.Now().Add(10 * time.Minute)
	now := time.Now()

	err := db.DB.Model(&models.User{}).Where(idQuery, userID).Updates(map[string]interface{}{
		"phone":                        req.Phone,
		"phone_verification_otp":      otpCode,
		"phone_verification_expires":  expiresAt,
		"phone_verification_attempts": 0,
		"phone_verification_last_sent": now,
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update phone settings"})
		return
	}

	// Mock SMS sending by logging to console
	log.Printf("[SMS MOCK] Verification code for user %v (%s): %s", userID, req.Phone, otpCode)

	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent successfully"})
}

// VerifyPhoneVerification handles POST /api/auth/verify-phone/verify
func VerifyPhoneVerification(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code is required"})
		return
	}

	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, idQuery, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.PhoneVerificationOTP == nil || *user.PhoneVerificationOTP == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No pending verification found"})
		return
	}

	if user.PhoneVerificationExpires == nil || user.PhoneVerificationExpires.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Verification code has expired"})
		return
	}

	if user.PhoneVerificationAttempts >= 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Too many failed attempts. Please request a new code."})
		return
	}

	if *user.PhoneVerificationOTP != req.Code {
		// Increment attempts
		db.DB.Model(&user).Update("phone_verification_attempts", user.PhoneVerificationAttempts+1)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification code"})
		return
	}

	// Success
	err := db.DB.Model(&user).Updates(map[string]interface{}{
		"phone_verified":              true,
		"phone_verification_otp":      nil,
		"phone_verification_expires":  nil,
		"phone_verification_attempts": 0,
	}).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete phone verification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Phone verified successfully"})
}

// Helper functions

func generateBackupCodes(count int) []string {
	codes := make([]string, count)
	for i := 0; i < count; i++ {
		// Generate 8-character alphanumeric code
		b := make([]byte, 4)
		rand.Read(b)
		codes[i] = base32.StdEncoding.EncodeToString(b)[:8]
	}
	return codes
}
