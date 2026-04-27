package handlers

import (
	"net/http"
	"strconv"
	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/config"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"
	"thanawy-backend/internal/services"

	"github.com/gin-gonic/gin"
)

var authService = &services.AuthService{}
var tokenService = &services.TokenService{}
var userRepo *repository.UserRepository

func getUserRepo() *repository.UserRepository {
	if userRepo == nil {
		userRepo = repository.NewUserRepository(db.DB)
	}
	return userRepo
}

// isProduction checks if the app is running in production mode
func isProduction() bool {
	cfg := config.Load()
	return cfg.Environment == "production"
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

	user, err := authService.Login(req.Email, req.Password, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	token, err := tokenService.GenerateAccessToken(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Set cookie for Next.js middleware compatibility
	// secure = true in production (HTTPS), false in development
	c.SetCookie("access_token", token, 3600*24, "/", "", isProduction(), true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   token,
		"user":    user,
	})
}

func Logout(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", isProduction(), true)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Logged out successfully"})
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
			"permissions":   defaultPermissions(user.Role, user.Permissions),
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
		updates["grade_level"] = req.GradeLevel
	}
	if req.EducationType != nil {
		updates["education_type"] = req.EducationType
	}
	if req.Permissions != nil {
		updates["permissions"] = req.Permissions
	}

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

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
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	role := models.RoleStudent
	if input.Role != "" {
		role = models.UserRole(input.Role)
	}

	user := models.User{
		Email:        input.Email,
		Name:         input.Name,
		Username:     input.Username,
		Role:         role,
		Phone:        input.Phone,
		PasswordHash: "$2a$12$RYM9CZPUKMeXAHOD01E4QeSjQIvT0.Q.rZEDkHXY/r8ok6sY4M1Ki", // Hash of "temporary-password"
	}

	if err := db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true, "user": user})
}

func buildUserDetailsPayload(user models.User) gin.H {
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
		"totalStudyTime":     0,
		"tasksCompleted":     0,
		"examsPassed":        0,
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
			"tasks":              0,
			"studySessions":      0,
			"achievements":       0,
			"notifications":      0,
			"examResults":        0,
			"subjectEnrollments": 0,
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
		updates["grade_level"] = req.GradeLevel
	}
	if req.EducationType != "" {
		updates["education_type"] = req.EducationType
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

	// Sync cache
	_ = getUserRepo().Update(&user)
	
	c.JSON(http.StatusOK, gin.H{"success": true, "user": user})
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
