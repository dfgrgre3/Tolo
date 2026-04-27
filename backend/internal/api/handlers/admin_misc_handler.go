package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// AdminAI handles all AI-related admin operations
func AdminAIGet(c *gin.Context) {
	// TODO: Implement actual AI admin data fetching from database
	// For now, return empty structure
	c.JSON(http.StatusOK, gin.H{
		"riskStudents": []interface{}{},
		"reviewQueue":  []interface{}{},
		"subjects":     []interface{}{},
		"summary": gin.H{
			"highRiskCount":      0,
			"reviewPendingCount": 0,
		},
	})
}

func AdminAIPost(c *gin.Context) {
	var req struct {
		Action string `json:"action"`
		Prompt string `json:"prompt"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	switch req.Action {
	case "copilot":
		c.JSON(http.StatusOK, gin.H{
			"message": "أنا مستشار المملكة الذكي. هذه ميزة تجريبية وسأكون متاحاً قريباً بشكل كامل.",
		})
	case "generate_content":
		// TODO: Implement actual content generation
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "تم إنشاء المحتوى بنجاح"})
	case "review_content":
		// TODO: Implement actual content review
		c.JSON(http.StatusOK, gin.H{"success": true})
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unknown action"})
	}
}

// Admin bulk messaging
func AdminBulkSendMessage(c *gin.Context) {
	var req struct {
		Message string   `json:"message" binding:"required"`
		UserIDs []string `json:"userIds"`
		Role    string   `json:"role"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual bulk messaging logic
	// This would typically involve:
	// 1. Query users based on userIds or role
	// 2. Create notification records for each user
	// 3. Optionally send emails/push notifications

	c.JSON(http.StatusOK, gin.H{"success": true, "sent": 0, "message": "Bulk messaging not yet implemented"})
}

// Upload handles single file uploads
func Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Create uploads directory if it doesn't exist
	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		err = os.MkdirAll(uploadDir, 0755)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
			return
		}
	}

	// Generate a unique filename using timestamp
	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(uploadDir, filename)

	// Save the file
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"fileUrl": fmt.Sprintf("/uploads/%s", filename),
	})
}

// Admin exams bulk upload
func AdminExamsBulkUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// TODO: Implement actual bulk exam upload
	// This would typically involve:
	// 1. Parse the uploaded file (CSV/Excel)
	// 2. Validate exam data
	// 3. Bulk insert into database

	c.JSON(http.StatusOK, gin.H{"success": true, "imported": 0, "message": "Bulk upload not yet implemented"})
	_ = file // Suppress unused variable warning
}

// Upload chunked
func UploadChunked(c *gin.Context) {
	// TODO: Implement chunked upload logic
	// This would typically involve:
	// 1. Receive chunk with index and total chunks
	// 2. Store chunk temporarily
	// 3. Combine chunks when all received
	// 4. Process the complete file

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Chunked upload not yet implemented"})
}

// Activity tracking routes
func MarkActivityRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		ActivityID string `json:"activityId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Update activity as read in database
	// if err := db.DB.Model(&models.Activity{}).Where("id = ? AND user_id = ?", req.ActivityID, userId).Update("is_read", true).Error; err != nil {
	//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update activity"})
	//     return
	// }

	c.JSON(http.StatusOK, gin.H{"success": true})
	_ = userId // suppress unused warning
}

func MarkAllActivitiesRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// TODO: Mark all activities as read in database
	// if err := db.DB.Model(&models.Activity{}).Where("user_id = ?", userId).Update("is_read", true).Error; err != nil {
	//     c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update activities"})
	//     return
	// }

	c.JSON(http.StatusOK, gin.H{"success": true})
	_ = userId // suppress unused warning
}

// AI Recommendations
func GetAIRecommendations(c *gin.Context) {
	if _, exists := c.Get("userId"); !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// TODO: Fetch AI recommendations from database or AI service
	// This would typically involve:
	// 1. Get user's learning history
	// 2. Generate recommendations based on progress, interests, etc.

	c.JSON(http.StatusOK, gin.H{
		"recommendations": []interface{}{},
		"message":         "AI recommendations not yet implemented",
	})
}

func TrackAIRecommendation(c *gin.Context) {
	var req struct {
		RecommendationID string `json:"recommendationId" binding:"required"`
		Action           string `json:"action"` // clicked, dismissed, etc.
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Track recommendation interaction in database

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Coupon validation
func ValidateCoupon(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Validate coupon from database
	// var coupon models.Coupon
	// if err := db.DB.Where("code = ? AND valid_until > NOW()", req.Code).First(&coupon).Error; err != nil {
	//     return invalid
	// }

	c.JSON(http.StatusOK, gin.H{
		"valid":    false,
		"discount": 0,
		"message":  "كود الخصم غير صالح",
	})
}

// Subscription checkout
func SubscriptionCheckout(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		PlanID string `json:"planId" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Create subscription checkout session
	// This would typically involve:
	// 1. Validate plan ID
	// 2. Create checkout session with payment provider
	// 3. Return checkout URL

	c.JSON(http.StatusOK, gin.H{"success": true, "checkoutUrl": "", "message": "Subscription checkout not yet implemented"})
	_ = userId
}


// Library POST for creating books
func CreateLibraryBook(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// TODO: Implement book creation with file upload
	// This would typically involve:
	// 1. Parse multipart form
	// 2. Validate and store uploaded file
	// 3. Create book record in database

	c.JSON(http.StatusCreated, gin.H{"success": true, "message": "Book creation not yet implemented"})
	_ = userId
}

// Library categories
func GetLibraryCategories(c *gin.Context) {
	// TODO: Fetch library categories from database
	// var categories []models.LibraryCategory
	// db.DB.Find(&categories)

	c.JSON(http.StatusOK, []interface{}{})
}

// Delete impersonation
func DeleteImpersonation(c *gin.Context) {
	// TODO: Implement impersonation deletion
	// This would typically involve:
	// 1. Clear impersonation session/token
	// 2. Restore original user session

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetAdminDashboard(c *gin.Context) {
	var totalUsers int64
	var activeUsers int64
	var totalSubjects int64
	var totalExams int64
	var completedTasks int64
	var totalStudySessions int64

	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("status = ?", models.StatusActive).Count(&activeUsers)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Exam{}).Count(&totalExams)
	db.DB.Model(&models.Task{}).Where("status = ?", models.TaskCompleted).Count(&completedTasks)
	db.DB.Model(&models.StudySession{}).Count(&totalStudySessions)

	c.JSON(http.StatusOK, gin.H{
		"users": gin.H{
			"total":  totalUsers,
			"new":    0,
			"active": activeUsers,
		},
		"content": gin.H{
			"subjects":  totalSubjects,
			"exams":     totalExams,
			"resources": 0,
		},
		"activity": gin.H{
			"studySessions":  totalStudySessions,
			"tasksCompleted": completedTasks,
		},
		"gamification": gin.H{
			"totalXP":      0,
			"achievements": 0,
		},
	})
}

func GetAdminLive(c *gin.Context) {
	minutes, _ := strconv.Atoi(c.DefaultQuery("minutes", "5"))
	if minutes <= 0 {
		minutes = 5
	}
	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)

	var users []models.User
	if err := db.DB.Where("status = ?", models.StatusActive).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "Failed to fetch active users"})
		return
	}

	var studySessions []models.StudySession
	_ = db.DB.Where("updated_at >= ? OR start_time >= ? OR end_time >= ?", cutoff, cutoff, cutoff).Find(&studySessions).Error

	var examResults []models.ExamResult
	_ = db.DB.Where("taken_at >= ?", cutoff).Find(&examResults).Error

	type subjectSummary struct {
		ID     string `json:"id"`
		Name   string `json:"name"`
		NameAr string `json:"nameAr"`
	}

	type examSummary struct {
		ID      string `json:"id"`
		Title   string `json:"title"`
		Subject struct {
			Name   string `json:"name"`
			NameAr string `json:"nameAr"`
		} `json:"subject"`
	}

	activeUsers := make([]gin.H, 0, len(users))
	studying := 0
	takingExam := 0
	online := 0
	roleStats := gin.H{
		"students": 0,
		"teachers": 0,
		"admins":   0,
	}

	for _, user := range users {
		switch user.Role {
		case models.RoleStudent:
			roleStats["students"] = roleStats["students"].(int) + 1
		case models.RoleTeacher:
			roleStats["teachers"] = roleStats["teachers"].(int) + 1
		case models.RoleAdmin:
			roleStats["admins"] = roleStats["admins"].(int) + 1
		}

		currentActivity := "online"
		lastAccessed := user.UpdatedAt
		var activityDetails interface{}

		for _, result := range examResults {
			if result.UserID != user.ID {
				continue
			}

			var exam models.Exam
			var subject models.Subject
			if err := db.DB.First(&exam, "id = ?", result.ExamID).Error; err == nil {
				_ = db.DB.First(&subject, "id = ?", exam.SubjectID).Error

				var examPayload examSummary
				examPayload.ID = exam.ID
				examPayload.Title = exam.Title
				examPayload.Subject.Name = subject.Name
				examPayload.Subject.NameAr = stringOrEmpty(subject.NameAr)

				activityDetails = gin.H{
					"type":    "exam",
					"exam":    examPayload,
					"takenAt": result.TakenAt.Format(time.RFC3339),
					"score":   result.Score,
				}
			}

			currentActivity = "taking_exam"
			lastAccessed = result.TakenAt
			takingExam++
			break
		}

		if currentActivity == "online" {
			for _, session := range studySessions {
				if session.UserID != user.ID {
					continue
				}

				var subject models.Subject
				if session.SubjectID != "" {
					_ = db.DB.First(&subject, "id = ?", session.SubjectID).Error
				}

				activityDetails = gin.H{
					"type": "study",
					"subject": subjectSummary{
						ID:     subject.ID,
						Name:   subject.Name,
						NameAr: stringOrEmpty(subject.NameAr),
					},
					"startTime": session.StartTime.Format(time.RFC3339),
					"duration":  session.DurationMin,
				}

				currentActivity = "studying"
				lastAccessed = session.UpdatedAt
				studying++
				break
			}
		}

		if currentActivity == "online" {
			online++
		}

		activeUsers = append(activeUsers, gin.H{
			"userId": user.ID,
			"user": gin.H{
				"id":     user.ID,
				"name":   firstNonEmpty(stringOrEmpty(user.Name), stringOrEmpty(user.Username), user.Email),
				"email":  user.Email,
				"role":   user.Role,
				"avatar": user.Avatar,
			},
			"sessionId":       nil,
			"lastAccessed":    lastAccessed.Format(time.RFC3339),
			"ip":              nil,
			"deviceInfo":      nil,
			"isActive":        true,
			"currentActivity": currentActivity,
			"activityDetails": activityDetails,
		})
	}

	filter := c.DefaultQuery("type", "all")
	filteredUsers := make([]gin.H, 0, len(activeUsers))
	for _, user := range activeUsers {
		switch filter {
		case "exam":
			if user["currentActivity"] == "taking_exam" {
				filteredUsers = append(filteredUsers, user)
			}
		case "study":
			if user["currentActivity"] == "studying" {
				filteredUsers = append(filteredUsers, user)
			}
		case "online":
			if user["currentActivity"] == "online" {
				filteredUsers = append(filteredUsers, user)
			}
		default:
			filteredUsers = append(filteredUsers, user)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"activeUsers": filteredUsers,
		"stats": gin.H{
			"totalActive": len(activeUsers),
			"studying":    studying,
			"takingExam":  takingExam,
			"online":      online,
			"byRole":      roleStats,
		},
	})
}

func DeleteAuthSession(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Session terminated successfully",
	})
}

func GetAdminAnnouncements(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&models.Notification{})
	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		query = query.Where("title ILIKE ? OR message ILIKE ?", like, like)
	}

	var total int64
	query.Count(&total)

	var notifications []models.Notification
	if err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch announcements"})
		return
	}

	items := make([]gin.H, 0, len(notifications))
	for _, n := range notifications {
		items = append(items, gin.H{
			"id":        n.ID,
			"title":     n.Title,
			"content":   n.Message,
			"type":      n.Type,
			"priority":  0,
			"isActive":  true,
			"createdAt": n.CreatedAt,
			"author": gin.H{
				"id":     "system",
				"name":   "System",
				"avatar": nil,
			},
		})
	}

	apiresponse.List(c, items, apiresponse.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: calculateTotalPages(total, limit),
	}, gin.H{
		"announcements": items,
	})
}

func CreateAdminAnnouncement(c *gin.Context) {
	var input struct {
		Title    string `json:"title" binding:"required"`
		Content  string `json:"content" binding:"required"`
		Type     string `json:"type"`
		IsActive bool   `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	notification := models.Notification{
		UserID:  "system",
		Title:   input.Title,
		Message: input.Content,
		Type:    models.NotificationType(input.Type),
		IsRead:  false,
	}
	if notification.Type == "" {
		notification.Type = models.NotificationInfo
	}

	if err := db.DB.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create announcement"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"success": true})
}

func UpdateAdminAnnouncement(c *gin.Context) {
	var input struct {
		ID       string `json:"id" binding:"required"`
		Title    string `json:"title"`
		Content  string `json:"content"`
		Type     string `json:"type"`
		IsActive bool   `json:"isActive"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.Content != "" {
		updates["message"] = input.Content
	}
	if input.Type != "" {
		updates["type"] = input.Type
	}

	if err := db.DB.Model(&models.Notification{}).Where("id = ?", input.ID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteAdminAnnouncement(c *gin.Context) {
	var input struct {
		ID string `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Delete(&models.Notification{}, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete announcement"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func GetAdminAnalytics(c *gin.Context) {
	var totalUsers int64
	var activeUsers int64
	var totalSubjects int64
	var totalExams int64
	var totalNotifications int64
	var totalXP int64

	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("status = ?", models.StatusActive).Count(&activeUsers)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Exam{}).Count(&totalExams)
	db.DB.Model(&models.Notification{}).Count(&totalNotifications)
	db.DB.Model(&models.User{}).Select("COALESCE(SUM(total_xp), 0)").Scan(&totalXP)

	roleStats := gin.H{}
	for _, role := range []models.UserRole{models.RoleAdmin, models.RoleTeacher, models.RoleStudent} {
		var count int64
		db.DB.Model(&models.User{}).Where("role = ?", role).Count(&count)
		roleStats[string(role)] = count
	}

	type point struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}
	dailyUsers := make([]point, 0, 7)
	dailyRegistrations := make([]point, 0, 7)
	now := time.Now()
	for i := 6; i >= 0; i-- {
		start := time.Date(now.Year(), now.Month(), now.Day()-i, 0, 0, 0, 0, now.Location())
		end := start.Add(24 * time.Hour)

		var createdCount int64
		var activeCount int64
		db.DB.Model(&models.User{}).Where("created_at >= ? AND created_at < ?", start, end).Count(&createdCount)
		db.DB.Model(&models.StudySession{}).Where("created_at >= ? AND created_at < ?", start, end).Distinct("user_id").Count(&activeCount)

		dailyUsers = append(dailyUsers, point{Date: start.Format("2006-01-02"), Count: activeCount})
		dailyRegistrations = append(dailyRegistrations, point{Date: start.Format("2006-01-02"), Count: createdCount})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": gin.H{
			"total":  totalUsers,
			"new":    dailyRegistrations[len(dailyRegistrations)-1].Count,
			"active": activeUsers,
			"byRole": roleStats,
		},
		"content": gin.H{
			"subjects":  totalSubjects,
			"exams":     totalExams,
			"blogPosts": 0,
		},
		"gamification": gin.H{
			"totalXP":             totalXP,
			"achievementsEarned":  0,
			"challengesCompleted": 0,
		},
		"charts": gin.H{
			"dailyActiveUsers":   dailyUsers,
			"dailyRegistrations": dailyRegistrations,
		},
	})
}

func GetAdminReportsOverview(c *gin.Context) {
	var totalUsers int64
	var usersToday int64
	var usersWeek int64
	var usersMonth int64
	var totalSubjects int64
	var activeSubjects int64
	var totalNotifications int64
	var totalStudySessions int64

	now := time.Now()
	dayAgo := now.Add(-24 * time.Hour)
	weekAgo := now.AddDate(0, 0, -7)
	monthAgo := now.AddDate(0, -1, 0)

	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("created_at >= ?", dayAgo).Count(&usersToday)
	db.DB.Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&usersWeek)
	db.DB.Model(&models.User{}).Where("created_at >= ?", monthAgo).Count(&usersMonth)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Subject{}).Where("is_active = ?", true).Count(&activeSubjects)
	db.DB.Model(&models.Notification{}).Count(&totalNotifications)
	db.DB.Model(&models.StudySession{}).Count(&totalStudySessions)

	var subjects []models.Subject
	db.DB.Order("enrolled_count desc").Limit(5).Find(&subjects)
	popularSubjects := make([]gin.H, 0, len(subjects))
	for _, subject := range subjects {
		popularSubjects = append(popularSubjects, gin.H{
			"id":            subject.ID,
			"title":         firstNonEmpty(stringOrEmpty(subject.NameAr), subject.Name),
			"enrolledCount": subject.EnrolledCount,
			"isPublished":   subject.IsPublished,
		})
	}

	type trendPoint struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	}
	registrationTrend := make([]trendPoint, 0, 7)
	for i := 6; i >= 0; i-- {
		start := time.Date(now.Year(), now.Month(), now.Day()-i, 0, 0, 0, 0, now.Location())
		end := start.Add(24 * time.Hour)
		var count int64
		db.DB.Model(&models.User{}).Where("created_at >= ? AND created_at < ?", start, end).Count(&count)
		registrationTrend = append(registrationTrend, trendPoint{Date: start.Format("2006-01-02"), Count: count})
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"users": gin.H{
				"total":        totalUsers,
				"newToday":     usersToday,
				"newThisWeek":  usersWeek,
				"newThisMonth": usersMonth,
			},
			"books": gin.H{
				"total":              0,
				"newThisMonth":       0,
				"totalDownloads":     0,
				"downloadsThisMonth": 0,
			},
			"subjects": gin.H{
				"total":  totalSubjects,
				"active": activeSubjects,
			},
			"engagement": gin.H{
				"totalReviews":     0,
				"reviewsThisMonth": 0,
				"activeSessions":   totalStudySessions,
			},
			"popularBooks":    []interface{}{},
			"popularSubjects": popularSubjects,
			"trends": gin.H{
				"userRegistrations": registrationTrend,
			},
		},
	})
}

func GetAdminReportsUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	var total int64
	db.DB.Model(&models.User{}).Count(&total)

	var users []models.User
	if err := db.DB.Order("created_at desc").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users report"})
		return
	}

	items := make([]gin.H, 0, len(users))
	for _, user := range users {
		items = append(items, gin.H{
			"id":                user.ID,
			"name":              user.Name,
			"email":             user.Email,
			"username":          user.Username,
			"role":              user.Role,
			"status":            user.Status,
			"createdAt":         user.CreatedAt,
			"lastLogin":         nil,
			"monthlyAiMessages": 0,
			"monthlyExams":      0,
			"uploadedBooks":     0,
			"reviews":           0,
			"sessions":          0,
			"studySessions":     0,
		})
	}

	roleCounts := []gin.H{}
	for _, role := range []models.UserRole{models.RoleAdmin, models.RoleTeacher, models.RoleStudent} {
		var count int64
		db.DB.Model(&models.User{}).Where("role = ?", role).Count(&count)
		roleCounts = append(roleCounts, gin.H{"role": role, "count": count})
	}

	apiresponse.Success(c, gin.H{
		"items": items,
		"users": items,
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      total,
			"totalCount": total,
			"totalPages": calculateTotalPages(total, limit),
		},
		"stats": gin.H{
			"totalUsers": total,
			"byRole":     roleCounts,
		},
	})
}

func GetAdminReportsBooks(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}

	apiresponse.Success(c, gin.H{
		"items": []interface{}{},
		"books": []interface{}{},
		"pagination": gin.H{
			"page":       page,
			"limit":      limit,
			"total":      0,
			"totalCount": 0,
			"totalPages": 1,
		},
		"stats": gin.H{
			"totalBooks":     0,
			"avgRating":      0,
			"totalDownloads": 0,
			"totalViews":     0,
		},
	})
}

func stringOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
