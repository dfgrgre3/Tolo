package handlers

import (
	"math"
	"net/http"
	"strconv"
	"time"
	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var subjectRepo *repository.SubjectRepository

func getSubjectRepo() *repository.SubjectRepository {
	if subjectRepo == nil {
		subjectRepo = repository.NewSubjectRepository(db.DB)
	}
	return subjectRepo
}

// Public handlers
func GetSubjects(c *gin.Context) {
	var subjects []models.Subject
	query := db.DB.Model(&models.Subject{}).Preload("Topics")

	// Filtering
	if catID := c.Query("categoryId"); catID != "" {
		query = query.Where("\"categoryId\" = ?", catID)
	}

	search := c.Query("search")
	if search != "" {
		query = query.Where("name ILIKE ? OR \"nameAr\" ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	offset, offsetErr := strconv.Atoi(c.Query("offset"))
	if limit <= 0 {
		limit = 10
	}
	if page <= 0 {
		page = 1
	}
	if offsetErr != nil {
		offset = (page - 1) * limit
	} else {
		page = (offset / limit) + 1
	}

	if level := c.Query("level"); level != "" {
		query = query.Where("level = ?", level)
	}
	if isPublished := c.Query("isPublished"); isPublished != "" {
		query = query.Where("\"isPublished\" = ?", isPublished == "true")
	}
	if isActive := c.Query("isActive"); isActive != "" {
		query = query.Where("\"isActive\" = ?", isActive == "true")
	}

	var total int64
	query.Count(&total)

	if err := query.Offset(offset).Limit(limit).Find(&subjects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch subjects"})
		return
	}

	// Optimize: Fetch all enrollment counts in one query
	subjectIDs := make([]string, len(subjects))
	for i, s := range subjects {
		subjectIDs[i] = s.ID
	}

	type countResult struct {
		SubjectID string
		Count     int64
	}
	var counts []countResult
	db.DB.Model(&models.Enrollment{}).
		Select("\"subjectId\", count(*) as count").
		Where("\"subjectId\" IN ?", subjectIDs).
		Group("\"subjectId\"").
		Scan(&counts)

	countMap := make(map[string]int64)
	for _, c := range counts {
		countMap[c.SubjectID] = c.Count
	}

	// Format response for frontend
	items := make([]gin.H, 0, len(subjects))
	for _, subject := range subjects {
		enrollments := countMap[subject.ID]
		items = append(items, gin.H{
			"id":                     subject.ID,
			"name":                   subject.Name,
			"nameAr":                 subject.NameAr,
			"code":                   subject.Code,
			"description":            subject.Description,
			"icon":                   subject.Icon,
			"color":                  subject.Color,
			"type":                   "COURSE",
			"isActive":               subject.IsActive,
			"isPublished":            subject.IsPublished,
			"price":                  subject.Price,
			"level":                  subject.Level,
			"instructorName":         subject.InstructorName,
			"instructorId":           subject.InstructorId,
			"categoryId":             subject.CategoryId,
			"thumbnailUrl":           subject.ThumbnailUrl,
			"trailerUrl":             subject.TrailerUrl,
			"trailerDurationMinutes": subject.TrailerDurationMinutes,
			"durationHours":          subject.DurationHours,
			"requirements":           subject.Requirements,
			"learningObjectives":     subject.LearningObjectives,
			"seoTitle":              subject.SeoTitle,
			"seoDescription":        subject.SeoDescription,
			"slug":                  subject.Slug,
			"rating":                subject.Rating,
			"enrolledCount":         subject.EnrolledCount,
			"createdAt":              subject.CreatedAt,
			"updatedAt":             subject.UpdatedAt,
			"_count": gin.H{
				"enrollments": enrollments,
				"topics":      len(subject.Topics),
				"reviews":     0,
				"teachers":    0,
			},
		})
	}

	apiresponse.List(c, items, apiresponse.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: int64(math.Ceil(float64(total) / float64(limit))),
	}, gin.H{
		"subjects": items,
		"courses":  items,
		"offset":   offset,
	})
}

func GetSubject(c *gin.Context) {
	id := c.Param("id")
	var subject models.Subject

	if err := db.DB.Preload("Topics.SubTopics.Attachments").Preload("Topics.SubTopics.Exam").First(&subject, "\"id\" = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		return
	}

	// Wrap for frontend
	c.JSON(http.StatusOK, gin.H{
		"subject": subject,
		"data": gin.H{
			"subject": subject,
			"course":  subject,
		},
	})
}

func GetCourseLessons(c *gin.Context) {
	id := c.Param("id")
	var subject models.Subject

	if err := db.DB.Preload("Topics.SubTopics").First(&subject, "\"id\" = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Simplified lesson structure for frontend
	type Lesson struct {
		ID              string `json:"id"`
		Title           string `json:"title"`
		Description     string `json:"description"`
		VideoUrl        string `json:"videoUrl"`
		IsFree          bool   `json:"isFree"`
		Order           int    `json:"order"`
		DurationMinutes int    `json:"durationMinutes"`
	}

	var lessons []Lesson
	for _, topic := range subject.Topics {
		for _, st := range topic.SubTopics {
			desc := ""
			if st.Description != nil {
				desc = *st.Description
			}
			vUrl := ""
			if st.VideoUrl != nil {
				vUrl = *st.VideoUrl
			}
			lessons = append(lessons, Lesson{
				ID:              st.ID,
				Title:           st.Title,
				Description:     desc,
				VideoUrl:        vUrl,
				IsFree:          st.IsFree,
				Order:           st.Order,
				DurationMinutes: st.DurationMinutes,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{"lessons": lessons})
}

func EnrollCourse(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userId, ok := userIdValue.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}
	courseId := c.Param("id")
	
	// Verify subject exists
	var subject models.Subject
	if err := db.DB.First(&subject, "\"id\" = ?", courseId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		return
	}

	// Check if user is already enrolled
	var enrollment models.Enrollment
	err := db.DB.Where("\"userId\" = ? AND \"subjectId\" = ?", userId, courseId).First(&enrollment).Error
	if err == nil {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Already enrolled"})
		return
	}

	// Payment verification logic
	if subject.Price > 0 {
		var payment models.Payment
		// Check for a COMPLETED payment for this subject and user
		err := db.DB.Where("\"userId\" = ? AND \"subjectId\" = ? AND status = ?", userId, courseId, models.PaymentCompleted).First(&payment).Error
		if err != nil {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":     "Payment required for this course",
				"courseId":  courseId,
				"price":     subject.Price,
				"requiresPayment": true,
			})
			return
		}
	}

	enrollment = models.Enrollment{
		UserID:     userId,
		SubjectID:  courseId,
		EnrolledAt: time.Now(),
	}

	if err := db.DB.Create(&enrollment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to enroll: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Enrolled successfully"})
}

func CourseCheckout(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userId := userIdValue.(string)
	courseId := c.Param("id")

	var input struct {
		PaymentMethod string `json:"paymentMethod" binding:"required"`
		CouponCode    string `json:"couponCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var subject models.Subject
	if err := db.DB.First(&subject, "\"id\" = ?", courseId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Course not found"})
		return
	}

	// Create a payment record
	payment := models.Payment{
		UserID:    userId,
		SubjectID: courseId,
		Amount:    subject.Price,
		Method:    input.PaymentMethod,
		Status:    models.PaymentPending,
		Reference: "COURSE-" + time.Now().Format("20060102150405"),
	}

	if err := db.DB.Create(&payment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment"})
		return
	}

	// For demonstration/initial link, if it's internal_wallet or a simulated success:
	if input.PaymentMethod == "internal_wallet" {
		// Use transaction with row-level lock for wallet payment
		txErr := db.DB.Transaction(func(tx *gorm.DB) error {
			var user models.User
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				First(&user, "id = ?", userId).Error; err != nil {
				return err
			}

			if user.Balance < subject.Price {
				return gorm.ErrInvalidData // Insufficient balance
			}

			// Atomic balance deduction
			if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", subject.Price)).Error; err != nil {
				return err
			}

			// Complete payment
			if err := tx.Model(&payment).Update("status", models.PaymentCompleted).Error; err != nil {
				return err
			}

			// Auto-enroll after successful payment
			enrollment := models.Enrollment{
				UserID:     userId,
				SubjectID:  courseId,
				EnrolledAt: time.Now(),
			}
			if err := tx.Create(&enrollment).Error; err != nil {
				// Ignore duplicate enrollment error
				_ = err
			}

			return nil
		})

		if txErr != nil {
			if txErr == gorm.ErrInvalidData {
				c.JSON(http.StatusBadRequest, gin.H{"error": "رصيدك غير كافٍ"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Payment failed"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Payment successful and enrolled",
		})
		return
	}

	// Mock Paymob response if using card
	if input.PaymentMethod == "card" || input.PaymentMethod == "wallet" || input.PaymentMethod == "fawry" {
		c.JSON(http.StatusOK, gin.H{
			"paymentKey": "mock_payment_key_" + payment.ID,
			"iframeId":    "123456", // Mock iframe ID
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": false, "error": "Unsupported payment method"})
}

func UpdateLessonProgress(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}
	userId, ok := userIdValue.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}
	lessonId := c.Param("id")

	var input struct {
		Completed bool `json:"completed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	var progress models.LessonProgress
	err := db.DB.Where("\"userId\" = ? AND \"subTopicId\" = ?", userId, lessonId).First(&progress).Error

	if err != nil {
		// Create new progress record
		progress = models.LessonProgress{
			UserID:    userId,
			LessonID:  lessonId,
			Completed: input.Completed,
		}
		if err := db.DB.Create(&progress).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to create lesson progress",
				"details": err.Error(),
			})
			return
		}
	} else {
		// Update existing
		if err := db.DB.Model(&progress).Update("completed", input.Completed).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to update lesson progress",
				"details": err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Admin handlers
func CreateSubject(c *gin.Context) {
	var subject models.Subject
	if err := c.ShouldBindJSON(&subject); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := getSubjectRepo().Create(&subject); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subject"})
		return
	}

	c.JSON(http.StatusCreated, subject)
}

func UpdateSubject(c *gin.Context) {
	var input models.Subject
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var subject models.Subject
	if err := db.DB.First(&subject, "id = ?", input.ID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		return
	}

	if err := db.DB.Model(&subject).Updates(input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subject"})
		return
	}

	// Sync cache
	_ = getSubjectRepo().Update(&subject)

	c.JSON(http.StatusOK, subject)
}

func DeleteSubject(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		var input struct {
			ID string `json:"id"`
		}
		_ = c.ShouldBindJSON(&input)
		id = input.ID
	}
	if err := getSubjectRepo().Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete subject"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Subject deleted successfully"})
}

func GetSubjectCurriculum(c *gin.Context) {
	id := c.Param("id")
	var subject models.Subject

	if err := db.DB.Preload("Topics.SubTopics").First(&subject, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Subject not found"})
		return
	}

	// Calculate stats
	chaptersCount := len(subject.Topics)
	lessonsCount := 0
	freeLessonsCount := 0
	totalDuration := 0

	for _, topic := range subject.Topics {
		lessonsCount += len(topic.SubTopics)
		for _, subtopic := range topic.SubTopics {
			if subtopic.IsFree {
				freeLessonsCount++
			}
			totalDuration += subtopic.DurationMinutes
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"stats": gin.H{
				"chaptersCount":        chaptersCount,
				"lessonsCount":         lessonsCount,
				"freeLessonsCount":     freeLessonsCount,
				"totalDurationMinutes": totalDuration,
			},
			"topics": subject.Topics,
		},
	})
}

func GetUserSubjects(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var enrollments []models.Enrollment
	if err := db.DB.Preload("Subject").Where("\"userId\" = ?", userId).Find(&enrollments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch enrollments"})
		return
	}

	// For the frontend useTimeData.ts which expects { id, subject: "MATH" }
	type subjectResponse struct {
		ID      string `json:"id"`
		Subject string `json:"subject"`
	}

	var response []subjectResponse
	for _, e := range enrollments {
		if e.Subject.ID != "" {
			response = append(response, subjectResponse{
				ID:      e.ID,
				Subject: e.Subject.Name, // Using name as the subject identifier
			})
		}
	}

	c.JSON(http.StatusOK, response)
}

func UpdateCourseCurriculum(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		Topics []models.Topic `json:"topics"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	// Use a transaction for bulk updates
	tx := db.DB.Begin()

	// For each topic, update or create
	for _, topic := range input.Topics {
		topic.SubjectID = id
		if topic.ID == "" {
			if err := tx.Create(&topic).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create topic"})
				return
			}
		} else {
			if err := tx.Save(&topic).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update topic"})
				return
			}
		}

		// Handle subtopics
		for _, st := range topic.SubTopics {
			st.TopicID = topic.ID
			if st.ID == "" {
				if err := tx.Create(&st).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create subtopic"})
					return
				}
			} else {
				if err := tx.Save(&st).Error; err != nil {
					tx.Rollback()
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update subtopic"})
					return
				}
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save curriculum changes"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Curriculum updated"})
}

func AddLessonAttachment(c *gin.Context) {
	lessonId := c.Param("id")
	var attachment models.LessonAttachment
	if err := c.ShouldBindJSON(&attachment); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	attachment.SubTopicID = lessonId
	if err := db.DB.Create(&attachment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add attachment"})
		return
	}

	c.JSON(http.StatusCreated, attachment)
}

func CreateCourseReview(c *gin.Context) {
	userId, _ := c.Get("userId")
	subjectId := c.Param("id")

	var review models.CourseReview
	if err := c.ShouldBindJSON(&review); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	review.UserID = userId.(string)
	review.SubjectID = subjectId

	if err := db.DB.Create(&review).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}

	// Update subject rating (simplified calculation)
	var avg float64
	db.DB.Model(&models.CourseReview{}).Where("\"subjectId\" = ?", subjectId).Select("avg(rating)").Scan(&avg)
	db.DB.Model(&models.Subject{}).Where("id = ?", subjectId).Update("rating", avg)

	c.JSON(http.StatusCreated, review)
}

func GetCourseReviews(c *gin.Context) {
	subjectId := c.Param("id")
	var reviews []models.CourseReview

	if err := db.DB.Preload("User").Where("\"subjectId\" = ? AND \"isVisible\" = ?", subjectId, true).Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}