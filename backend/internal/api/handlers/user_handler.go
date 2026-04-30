package handlers

import (
	cryptoRand "crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"
	"thanawy-backend/internal/services"

	"time"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

var authService = &services.AuthService{}
var tokenService = &services.TokenService{}
var userRepo *repository.UserRepository
var sessionRepo *repository.SessionRepository

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
func getMockLocation(ip string) *string {
	loc := "القاهرة، مصر"
	return &loc
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()

	user, err := authService.Login(req.Email, req.Password, ip, userAgent)
	if err != nil {
		// Log failed login attempt
		_ = LogSecurityEvent("", models.SecurityEventLoginFailed, ip, userAgent, nil, nil)
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	// Generate Token Pair
	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate tokens", "details": err.Error()})
		return
	}

	// Create Session in DB
	location := getMockLocation(ip)
	session := &models.UserSession{
		ID:           tokens.JTI,
		UserID:       user.ID,
		RefreshToken: tokens.RefreshToken,
		UserAgent:    userAgent,
		IP:           ip,
		Location:     location,
		ExpiresAt:    time.Now().Add(30 * 24 * time.Hour),
		LastAccessed: time.Now(),
	}

	// Device Limiting: Ensure only 2 devices
	activeSessions, _ := getSessionRepo().GetActiveSessions(user.ID)
	if len(activeSessions) >= 2 {
		// Log a security event about device limit reach
		_ = LogSecurityEvent(user.ID, "DEVICE_LIMIT_REACHED", ip, userAgent, location, nil)
		
		// Auto-logout the oldest session to allow this new login
		oldestSession := activeSessions[0]
		_ = getSessionRepo().RevokeSessionByJTI(oldestSession.ID)
	}

	if err := getSessionRepo().Create(session); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session", "details": err.Error()})
		return
	}

	// Log security event
	if err := LogSecurityEvent(user.ID, models.SecurityEventLoginSuccess, ip, userAgent, location, nil); err != nil {
		// Log error but don't fail the login
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"user":    user,
			"warning": "Login successful but failed to log security event",
			"metadata": gin.H{
				"lastLogin": user.UpdatedAt,
				"ip":        ip,
				"device":    userAgent,
				"location":  location,
			},
		})
		return
	}

	// Set cookies
	c.SetCookie("access_token", tokens.AccessToken, 3600*24, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", tokens.RefreshToken, 3600*24*30, "/api/auth/refresh", "", isProduction(), true)

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
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	// Generate new access token (Keep the same JTI/Session for simplicity or rotate)
	tokens, err := tokenService.GenerateTokenPair(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh token"})
		return
	}

	// Revoke old session and create new one (Token Rotation)
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
	c.SetCookie("refresh_token", tokens.RefreshToken, 3600*24*30, "/api/auth/refresh", "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
	})
}

func Logout(c *gin.Context) {
	if token, err := c.Cookie("access_token"); err == nil {
		if claims, err := tokenService.ValidateToken(token); err == nil {
			_ = getSessionRepo().RevokeSessionByJTI(claims.JTI)
		}
	}

	c.SetCookie("access_token", "", -1, "/", "", isProduction(), true)
	c.SetCookie("refresh_token", "", -1, "/api/auth/refresh", "", isProduction(), true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
}

func GetAuthSessions(c *gin.Context) {
	userID, _ := c.Get("userId")
	var sessions []models.UserSession
	if err := db.DB.Where("\"userId\" = ? AND \"isActive\" = ?", userID, true).Find(&sessions).Error; err != nil {
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

	// SECURITY: Verify the session belongs to the authenticated user
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var session models.UserSession
	if err := db.DB.Where("id = ? AND \"userId\" = ?", sessionID, userID).First(&session).Error; err != nil {
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
	// Example: Mark device as trusted or similar
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
		Role:          models.RoleStudent, // Default to Student for safety
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

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"user":    user,
	})
}

func GetProfile(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	user, err := getUserRepo().FindByID(userId.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Wrap in { user: ... } for frontend compatibility if needed
	// The frontend AuthContext.tsx:217 expects { user: data.user }
	c.JSON(http.StatusOK, gin.H{"user": user})
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
			"permissions":   defaultPermissions(user.Role, []string(user.Permissions)),
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

	apiresponse.List(c, items, apiresponse.Pagination{
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Role != "" {
		// Validate role to prevent privilege escalation
		validRoles := map[string]bool{"STUDENT": true, "TEACHER": true, "ADMIN": true}
		if !validRoles[req.Role] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
			return
		}
		updates["role"] = req.Role
	}
	if req.Name != nil {
		updates["name"] = req.Name
	}
	if req.Username != nil {
		updates["username"] = req.Username
	}
	if req.Email != nil {
		updates["email"] = req.Email
	}
	if req.Phone != nil {
		updates["phone"] = req.Phone
	}
	if req.Bio != nil {
		updates["bio"] = req.Bio
	}
	if req.GradeLevel != nil {
		updates["gradeLevel"] = req.GradeLevel
	}
	if req.EducationType != nil {
		updates["educationType"] = req.EducationType
	}
	if req.Permissions != nil {
		updates["permissions"] = models.JSONStringArray(req.Permissions)
	}

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	// Reload user to get fresh data (avoid stale cache write)
	db.DB.First(&user, "id = ?", user.ID)
	// Sync cache
	_ = getUserRepo().Update(&user)
	
	c.JSON(http.StatusOK, gin.H{"success": true, "user": user})
}

func GetGuestUser(c *gin.Context) {
	// Return a static or generated guest ID
	c.JSON(http.StatusOK, gin.H{"id": "guest_" + config.Load().Environment})
}

func GetUserByID(c *gin.Context) {
	id := c.Param("id")

	user, err := getUserRepo().FindByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, buildUserDetailsPayload(*user))
}

func DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		userID = c.Query("userId")
	}
	if userID == "" {
		var input struct {
			ID string `json:"id"`
		}
		_ = c.ShouldBindJSON(&input)
		userID = input.ID
	}
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	if err := db.DB.Delete(&models.User{}, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role - only allow valid roles
	role := models.RoleStudent
	if input.Role != "" {
		validRoles := map[string]bool{"STUDENT": true, "TEACHER": true, "ADMIN": true}
		if !validRoles[input.Role] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
			return
		}
		role = models.UserRole(input.Role)
	}

	// Generate a random temporary password if none provided
	password := input.Password
	if password == "" {
		b := make([]byte, 16)
		_, _ = cryptoRand.Read(b)
		password = hex.EncodeToString(b)
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "user": user})
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

	db.DB.Model(&models.Task{}).Where("\"userId\" = ? AND status = ?", user.ID, models.TaskCompleted).Count(&tasksCompleted)
	db.DB.Model(&models.Task{}).Where("\"userId\" = ?", user.ID).Count(&totalTasks)
	db.DB.Model(&models.StudySession{}).Where("\"userId\" = ?", user.ID).Count(&totalStudySessions)
	db.DB.Model(&models.StudySession{}).Where("\"userId\" = ?", user.ID).Select("COALESCE(SUM(\"durationMin\"), 0)").Scan(&totalStudyTime)
	db.DB.Model(&models.ExamResult{}).Where("\"userId\" = ? AND passed = ?", user.ID, true).Count(&examsPassed)
	db.DB.Model(&models.ExamResult{}).Where("\"userId\" = ?", user.ID).Count(&examResultsCount)
	db.DB.Model(&models.Notification{}).Where("\"userId\" = ? AND \"isRead\" = ?", user.ID, false).Count(&unreadNotifications)
	db.DB.Model(&models.Enrollment{}).Where("\"userId\" = ?", user.ID).Count(&totalEnrollments)
	// Add achievements count if table exists, else 0
	// db.DB.Model(&models.Achievement{}).Where("\"userId\" = ?", user.ID).Count(&achievementsCount)

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
		"currentStreak":      0, // Streak logic requires a separate daily activity tracking table or complex query
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
		Name          string  `json:"name"`
		Username      string  `json:"username"`
		Phone         string  `json:"phone"`
		Bio           string  `json:"bio"`
		GradeLevel    string  `json:"gradeLevel"`
		EducationType string  `json:"educationType"`
		Section       string  `json:"section"`
		Country       string  `json:"country"`
		City          string  `json:"city"`
		Avatar        string  `json:"avatar"`
		BirthDate     string  `json:"birthDate"`
		Gender        string  `json:"gender"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Bio != "" {
		updates["bio"] = req.Bio
	}
	if req.GradeLevel != "" {
		updates["gradeLevel"] = req.GradeLevel
	}
	if req.EducationType != "" {
		updates["educationType"] = req.EducationType
	}
	if req.Section != "" {
		updates["section"] = req.Section
	}
	if req.Country != "" {
		updates["country"] = req.Country
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Gender != "" {
		updates["gender"] = req.Gender
	}

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	// Reload user to get fresh data before caching (avoid stale cache write)
	db.DB.First(&user, "id = ?", user.ID)
	// Sync cache
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
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var payments []models.Payment
	db.DB.Where("\"userId\" = ?", user.ID).Order("\"createdAt\" desc").Limit(20).Find(&payments)

	var totalSpent float64
	var successCount int64
	var pendingCount int64
	var failedCount int64

	for _, p := range payments {
		if p.Status == models.PaymentCompleted {
			totalSpent += p.Amount
			successCount++
		} else if p.Status == models.PaymentPending {
			pendingCount++
		} else {
			failedCount++
		}
	}

	// Mock stats if needed or use real ones
	c.JSON(http.StatusOK, gin.H{
		"name":                  stringOrEmpty(user.Name),
		"email":                 user.Email,
		"balance":               user.Balance,
		"additionalAiCredits":   user.AiCredits,
		"additionalExamCredits": user.ExamCredits,
		"activeSubscription":    nil, // TODO: Implement active subscription logic
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
	switch role {
	case models.RoleAdmin:
		return []string{"admin:*"}
	case models.RoleTeacher:
		return []string{"courses:read", "exams:read"}
	default:
		return []string{}
	}
}