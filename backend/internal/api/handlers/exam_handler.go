package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func GetExams(c *gin.Context) {
	if db.DB == nil {
		log.Println("[GetExams] Critical: Database connection (db.DB) is nil")
		api_response.Error(c, http.StatusInternalServerError, "Internal Server Error: Database not initialized")
		return
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	query := db.DB.Model(&models.Exam{})
	if search := c.Query("search"); search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
	}

	var total int64
	// Use Session to avoid modifying the original query object for subsequent Find
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		log.Printf("[GetExams] Error counting exams: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to count exams")
		return
	}

	var exams []models.Exam
	if err := query.Preload("Subject").Offset(offset).Limit(limit).Find(&exams).Error; err != nil {
		log.Printf("[GetExams] Error fetching exams: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch exams")
		return
	}

	GlobalNotifyAdmins("استعراض الاختبارات", fmt.Sprintf("قام مستخدم باستعراض قائمة الاختبارات المتاحة (%d اختبار)", len(exams)), "info")

	// Collect exam IDs for result counts
	examIDs := make([]string, 0, len(exams))
	for _, e := range exams {
		if e.ID != "" {
			examIDs = append(examIDs, e.ID)
		}
	}

	type countResult struct {
		ExamID string `gorm:"column:examId"`
		Count  int64  `gorm:"column:count"`
	}
	var counts []countResult
	countMap := make(map[string]int64)

	// Only query results if we have exams, avoiding potential SQL syntax errors (e.g. "IN ()")
	if len(examIDs) > 0 {
		if err := db.DB.Model(&models.ExamResult{}).
			Select("exam_id, count(*) as count").
			Where("exam_id IN ?", examIDs).
			Group("exam_id").
			Scan(&counts).Error; err != nil {
			log.Printf("[GetExams] Warning: Error scanning exam result counts: %v", err)
			// Non-critical, we can continue with zero counts
		}

		for _, c := range counts {
			countMap[c.ExamID] = c.Count
		}
	}

	// Format response for frontend
	items := make([]gin.H, 0, len(exams))
	for _, exam := range exams {
		// Defensive subject access
		subjectData := gin.H{
			"id":     "",
			"name":   "عام",
			"nameAr": "عام",
		}
		if exam.Subject.ID != "" {
			subjectData = gin.H{
				"id":     exam.Subject.ID,
				"name":   exam.Subject.Name,
				"nameAr": exam.Subject.NameAr,
			}
		}

		resultsCount := countMap[exam.ID]

		items = append(items, gin.H{
			"id":            exam.ID,
			"title":         exam.Title,
			"description":   exam.Description,
			"duration":      exam.Duration,
			"questionCount": exam.QuestionCount,
			"difficulty":    exam.Difficulty,
			"isActive":      exam.IsActive,
			"year":          exam.CreatedAt.Year(),
			"createdAt":     exam.CreatedAt,
			"subject":       subjectData,
			"resultsCount":  resultsCount,
		})
	}

	api_response.List(c, items, api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: calculateTotalPages(total, limit),
	}, gin.H{
		"exams": items,
	})
}

func CreateExam(c *gin.Context) {
	var input struct {
		Title     string `json:"title" binding:"required"`
		SubjectID string `json:"subjectId" binding:"required"`
		Year      int    `json:"year"`
		URL       string `json:"url"`
		Type      string `json:"type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	exam := models.Exam{
		SubjectID: input.SubjectID,
		Title:     input.Title,
		Type:      models.ExamType(input.Type),
	}
	if exam.Type == "" {
		exam.Type = models.ExamTypeQuiz
	}

	if err := db.DB.Create(&exam).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create exam"})
		return
	}

	services.GetAuditService().LogAsync("", services.AuditEventAdminAction, "exam", exam.ID, map[string]interface{}{"action": "create", "title": exam.Title}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusCreated, gin.H{"success": true, "exam": exam})
}

func UpdateExam(c *gin.Context) {
	var input struct {
		ID        string `json:"id" binding:"required"`
		Title     string `json:"title"`
		SubjectID string `json:"subjectId"`
		Type      string `json:"type"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var exam models.Exam
	if err := db.DB.First(&exam, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	updates := map[string]interface{}{}
	if input.Title != "" {
		updates["title"] = input.Title
	}
	if input.SubjectID != "" {
		updates["subjectId"] = input.SubjectID
	}
	if input.Type != "" {
		updates["type"] = input.Type
	}

	if err := db.DB.Model(&exam).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update exam"})
		return
	}

	services.GetAuditService().LogAsync("", services.AuditEventAdminAction, "exam", exam.ID, map[string]interface{}{"action": "update", "updates": updates}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func DeleteExam(c *gin.Context) {
	var input struct {
		ID string `json:"id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := db.DB.Delete(&models.Exam{}, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exam"})
		return
	}

	services.GetAuditService().LogAsync("", services.AuditEventDataDeletion, "exam", input.ID, map[string]interface{}{"action": "delete"}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func SubmitExam(c *gin.Context) {
	userId, _ := c.Get("userId")
	examId := c.Param("id")

	var submission struct {
		Answers map[string]string `json:"answers"`
	}

	if err := c.ShouldBindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission"})
		return
	}

	// 1. Fetch exam with questions (only load necessary fields to reduce memory usage)
	var exam models.Exam
	if err := db.DB.Preload("Questions", func(db *gorm.DB) *gorm.DB {
		return db.Select("id", "answer")
	}).First(&exam, "id = ?", examId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	// 2. Grade the exam
	correctCount := 0
	totalQuestions := len(exam.Questions)

	for _, question := range exam.Questions {
		userAnswer, ok := submission.Answers[question.ID]
		if !ok {
			continue // Question not answered, treat as incorrect
		}

		// Compare answers (exact match for simplicity)
		if userAnswer == question.Answer {
			correctCount++
		}
	}

	// 3. Calculate score
	var score float64
	if totalQuestions > 0 {
		score = (float64(correctCount) / float64(totalQuestions)) * exam.MaxScore
	}

	// 4. Determine if passed (passing threshold: 50% of max score)
	passed := score >= (exam.MaxScore * 0.5)

	// 5. Save result in a transaction to ensure consistency
	answersJSON, _ := json.Marshal(submission.Answers)
	result := models.ExamResult{
		UserID:  userId.(string),
		ExamID:  examId,
		Score:   score,
		Passed:  passed,
		Answers: string(answersJSON),
		TakenAt: time.Now(),
	}

	tx := db.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	if err := tx.Create(&result).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	services.GetAuditService().LogAsync(userId.(string), services.AuditEventExamFinished, "exam", examId, map[string]interface{}{"score": score, "passed": passed}, c.ClientIP(), c.Request.UserAgent())

	// Notify admins about exam completion
	statusStr := "فشل"
	if passed {
		statusStr = "نجح"
	}
	GlobalNotifyAdmins("اكتمال اختبار", fmt.Sprintf("أكمل المستخدم اختبار %s بنتيجة %.1f (%s)", exam.Title, score, statusStr), "info")

	c.JSON(http.StatusOK, result)
}

func GetExamResults(c *gin.Context) {
	userId := c.Query("userId")
	if userId == "" {
		val, exists := c.Get("userId")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userId = val.(string)
	}

	var results []models.ExamResult
	if err := db.DB.Preload("Exam.Subject").Preload("Exam.Questions").Where("user_id = ?", userId).Order("taken_at desc").Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	c.JSON(http.StatusOK, results)
}
