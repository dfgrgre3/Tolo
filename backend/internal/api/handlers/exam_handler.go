package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type l1ExamsEntry struct {
	data      gin.H
	expiresAt time.Time
}

var (
	l1ExamsCache sync.Map
)

func GetExams(c *gin.Context) {
	if db.ReadDB() == nil {
		log.Println("[GetExams] Critical: Database connection (db.ReadDB()) is nil")
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

	search := c.Query("search")
	useCache := db.Redis != nil && search == ""
	cacheKey := fmt.Sprintf("exams:list:page:%d:limit:%d", page, limit)
	if useCache {
		// 1. Try L1 cache first
		if val, ok := l1ExamsCache.Load(cacheKey); ok {
			entry := val.(*l1ExamsEntry)
			if time.Now().Before(entry.expiresAt) {
				api_response.Success(c, entry.data)
				return
			}
			l1ExamsCache.Delete(cacheKey)
		}

		// 2. Try Redis cache next
		if cachedVal, err := db.Redis.Get(c.Request.Context(), cacheKey).Result(); err == nil {
			var cachedResponse gin.H
			if json.Unmarshal([]byte(cachedVal), &cachedResponse) == nil {
				// Warm L1
				l1ExamsCache.Store(cacheKey, &l1ExamsEntry{
					data:      cachedResponse,
					expiresAt: time.Now().Add(15 * time.Second),
				})
				api_response.Success(c, cachedResponse)
				return
			}
		}
	}

	query := db.ReadDB().Model(&models.Exam{})
	if search != "" {
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

	countMap := getExamResultCounts(exams)
	items := formatExamResponse(exams, countMap)

	responseData := gin.H{
		"items": items,
		"pagination": api_response.Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: calculateTotalPages(total, limit),
		},
		"exams": items,
	}

	if useCache {
		// Store in L1 cache
		l1ExamsCache.Store(cacheKey, &l1ExamsEntry{
			data:      responseData,
			expiresAt: time.Now().Add(15 * time.Second),
		})
		// Write to Redis asynchronously
		go func(key string, data gin.H) {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if cacheBytes, err := json.Marshal(data); err == nil {
				db.Redis.Set(ctx, key, cacheBytes, 5*time.Minute)
			}
		}(cacheKey, responseData)
	}

	api_response.Success(c, responseData)
}

// getExamResultCounts fetches the number of results for each exam
func getExamResultCounts(exams []models.Exam) map[string]int64 {
	countMap := make(map[string]int64)
	if len(exams) == 0 {
		return countMap
	}

	// Collect exam IDs
	examIDs := make([]string, 0, len(exams))
	for _, e := range exams {
		if e.ID != "" {
			examIDs = append(examIDs, e.ID)
		}
	}

	if len(examIDs) == 0 {
		return countMap
	}

	type countResult struct {
		ExamID string `gorm:"column:exam_id"`
		Count  int64  `gorm:"column:count"`
	}
	var counts []countResult

	if err := db.DB.Model(&models.ExamResult{}).
		Select("exam_id, count(*) as count").
		Where("exam_id IN ?", examIDs).
		Group("exam_id").
		Scan(&counts).Error; err != nil {
		log.Printf("[getExamResultCounts] Warning: Error scanning exam result counts: %v", err)
	}

	for _, c := range counts {
		countMap[c.ExamID] = c.Count
	}
	return countMap
}

// formatExamResponse formats the exams for the frontend response
func formatExamResponse(exams []models.Exam, countMap map[string]int64) []gin.H {
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
			"resultsCount":  countMap[exam.ID],
		})
	}
	return items
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

	if err := db.WriteDB().Create(&exam).Error; err != nil {
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
	if err := db.ReadDB().Take(&exam, idQuery, input.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	type examUpdates struct {
		Title     *string `gorm:"column:title"`
		SubjectID *string `gorm:"column:subject_id"`
		Type      *string `gorm:"column:type"`
	}

	updates := examUpdates{}
	if input.Title != "" {
		updates.Title = &input.Title
	}
	if input.SubjectID != "" {
		updates.SubjectID = &input.SubjectID
	}
	if input.Type != "" {
		updates.Type = &input.Type
	}

	if err := db.WriteDB().Model(&models.Exam{}).Where(idQuery, exam.ID).
		Updates(&updates).Error; err != nil {
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

	if err := db.WriteDB().Delete(&models.Exam{}, idQuery, input.ID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete exam"})
		return
	}

	services.GetAuditService().LogAsync("", services.AuditEventDataDeletion, "exam", input.ID, map[string]interface{}{"action": "delete"}, c.ClientIP(), c.Request.UserAgent())

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func SubmitExam(c *gin.Context) {
	userID, _ := c.Get("userId")
	examID := c.Param("id")

	var submission struct {
		Answers map[string]string `json:"answers"`
	}

	if err := c.ShouldBindJSON(&submission); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid submission"})
		return
	}

	// ---- READ: Fetch exam from read replica ----
	var exam models.Exam
	if err := db.ReadDB().Preload("Questions", func(d *gorm.DB) *gorm.DB {
		return d.Select("id", "answer")
	}).Take(&exam, idQuery, examID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exam not found"})
		return
	}

	// ---- BUSINESS LOGIC: Grade the exam (no DB) ----
	correctCount := 0
	totalQuestions := len(exam.Questions)
	for _, question := range exam.Questions {
		userAnswer, ok := submission.Answers[question.ID]
		if !ok {
			continue
		}
		if userAnswer == question.Answer {
			correctCount++
		}
	}

	var score float64
	if totalQuestions > 0 {
		score = (float64(correctCount) / float64(totalQuestions)) * exam.MaxScore
	}
	passed := score >= (exam.MaxScore * 0.5)

	// ---- WRITE: Save result using write source ----
	answersJSON, _ := json.Marshal(submission.Answers)
	result := models.ExamResult{
		UserID:  userID.(string),
		ExamID:  examID,
		Score:   score,
		Passed:  passed,
		Answers: string(answersJSON),
		TakenAt: time.Now(),
	}

	if err := db.WithWriteTx(func(tx *gorm.DB) error {
		return tx.Create(&result).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	services.GetAuditService().LogAsync(userID.(string), services.AuditEventExamFinished, "exam", examID,
		map[string]interface{}{"score": score, "passed": passed}, c.ClientIP(), c.Request.UserAgent())

	statusStr := "فشل"
	if passed {
		statusStr = "نجح"
	}
	GlobalNotifyAdmins("اكتمال اختبار",
		fmt.Sprintf("أكمل المستخدم اختبار %s بنتيجة %.1f (%s)", exam.Title, score, statusStr), "info")

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
	if err := db.ReadDB().Preload("Exam.Subject").Preload("Exam.Questions").Where("user_id = ?", userId).Order("taken_at desc").Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	c.JSON(http.StatusOK, results)
}
