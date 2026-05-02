package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
)

func GetExams(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = 10
	}
	offset := (page - 1) * limit

	var exams []models.Exam
	query := db.DB.Model(&models.Exam{})
	if search := c.Query("search"); search != "" {
		query = query.Where("title ILIKE ?", "%"+search+"%")
	}

	var total int64
	query.Count(&total)

	if err := query.Preload("Subject").Offset(offset).Limit(limit).Find(&exams).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch exams"})
		return
	}

	// Optimize: Fetch all result counts in one query
	examIDs := make([]string, len(exams))
	for i, e := range exams {
		examIDs[i] = e.ID
	}

	type countResult struct {
		ExamID string
		Count  int64
	}
	var counts []countResult
	db.DB.Model(&models.ExamResult{}).
		Select("\"examId\", count(*) as count").
		Where("\"examId\" IN ?", examIDs).
		Group("\"examId\"").
		Scan(&counts)

	countMap := make(map[string]int64)
	for _, c := range counts {
		countMap[c.ExamID] = c.Count
	}

	items := make([]gin.H, 0, len(exams))
	for _, exam := range exams {
		resultsCount := countMap[exam.ID]

		items = append(items, gin.H{
			"id":        exam.ID,
			"title":     exam.Title,
			"year":      exam.CreatedAt.Year(),
			"url":       "",
			"type":      exam.Type,
			"createdAt": exam.CreatedAt,
			"subject": gin.H{
				"id":     exam.Subject.ID,
				"name":   exam.Subject.Name,
				"nameAr": exam.Subject.NameAr,
			},
			"_count": gin.H{
				"results": resultsCount,
			},
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

	// 1. Fetch exam with questions
	var exam models.Exam
	if err := db.DB.Preload("Questions").First(&exam, "id = ?", examId).Error; err != nil {
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

	// 5. Save result
	answersJSON, _ := json.Marshal(submission.Answers)
	result := models.ExamResult{
		UserID:  userId.(string),
		ExamID:  examId,
		Score:   score,
		Passed:  passed,
		Answers: string(answersJSON),
		TakenAt: time.Now(),
	}

	if err := db.DB.Create(&result).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save result"})
		return
	}

	// Notify admins about exam completion
	statusStr := "فشل"
	if passed { statusStr = "نجح" }
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
	if err := db.DB.Preload("Exam.Subject").Preload("Exam.Questions").Where("\"userId\" = ?", userId).Order("\"takenAt\" desc").Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch results"})
		return
	}

	c.JSON(http.StatusOK, results)
}
