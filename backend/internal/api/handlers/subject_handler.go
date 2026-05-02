package handlers

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/repository"
	"thanawy-backend/internal/services"
	"time"
	"fmt"

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
	query := db.DB.Model(&models.Subject{})

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
	if limit > 100 {
		limit = 100
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

	if err := query.Order("\"createdAt\" desc").Offset(offset).Limit(limit).Find(&subjects).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch subjects")
		return
	}

	// Keep list pages light: do not preload full curriculum; only fetch topic counts.
	subjectIDs := make([]string, len(subjects))
	for i, s := range subjects {
		subjectIDs[i] = s.ID
	}

	type countResult struct {
		SubjectID string
		Count     int64
	}
	var topicCounts []countResult
	if len(subjectIDs) > 0 {
		db.DB.Model(&models.Topic{}).
			Select("\"subjectId\", count(*) as count").
			Where("\"subjectId\" IN ?", subjectIDs).
			Group("\"subjectId\"").
			Scan(&topicCounts)
	}

	topicCountMap := make(map[string]int64)
	for _, c := range topicCounts {
		topicCountMap[c.SubjectID] = c.Count
	}

	// Format response for frontend
	items := make([]gin.H, 0, len(subjects))
	for _, subject := range subjects {
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
			"seoTitle":               subject.SeoTitle,
			"seoDescription":         subject.SeoDescription,
			"slug":                   subject.Slug,
			"rating":                 subject.Rating,
			"enrolledCount":          subject.EnrolledCount,
			"createdAt":              subject.CreatedAt,
			"updatedAt":              subject.UpdatedAt,
			"_count": gin.H{
				"enrollments": subject.EnrolledCount,
				"topics":      topicCountMap[subject.ID],
				"reviews":     0,
				"teachers":    0,
			},
		})
	}

	api_response.List(c, items, api_response.Pagination{
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
		api_response.Error(c, http.StatusNotFound, "Subject not found")
		return
	}

	// Wrap for frontend
	api_response.Success(c, gin.H{
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
		api_response.Error(c, http.StatusNotFound, "Course not found")
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

	api_response.Success(c, gin.H{"lessons": lessons})
}

func EnrollCourse(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		api_response.Error(c, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userId, ok := userIdValue.(string)
	if !ok {
		api_response.Error(c, http.StatusInternalServerError, "Invalid user ID type")
		return
	}
	courseId := c.Param("id")

	// Ensure the authenticated account exists instead of creating placeholder users.
	var user models.User
	if err := db.DB.First(&user, "id = ?", userId).Error; err != nil {
		log.Printf("[Enrollment] authenticated user was not found in database: %s", userId)
		api_response.Error(c, http.StatusUnauthorized, "User account was not found. Please sign in again or complete registration.")
		return
	}

	// Verify subject exists
	var subject models.Subject
	if err := db.DB.First(&subject, "\"id\" = ?", courseId).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Subject not found")
		return
	}

	// Check if user is already enrolled
	var enrollment models.Enrollment
	err := db.DB.Where("\"userId\" = ? AND \"subjectId\" = ?", userId, courseId).First(&enrollment).Error
	if err == nil {
		api_response.Success(c, gin.H{"success": true, "message": "Already enrolled"})
		return
	}

	// Payment verification logic
	if subject.Price > 0 {
		var payment models.Payment
		// Check for a COMPLETED payment for this subject and user
		err := db.DB.Where("\"userId\" = ? AND \"subjectId\" = ? AND status = ?", userId, courseId, models.PaymentCompleted).First(&payment).Error
		if err != nil {
			api_response.Success(c, gin.H{
				"error":           "Payment required for this course",
				"courseId":        courseId,
				"price":           subject.Price,
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

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			return tx.Model(&models.Subject{}).
				Where("id = ?", courseId).
				Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1")).Error
		}
		return nil
	}); err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to enroll: "+err.Error())
		return
	}
 
	api_response.Success(c, gin.H{"success": true, "message": "Enrolled successfully"})
}

func CourseCheckout(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		api_response.Error(c, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userId := userIdValue.(string)
	courseId := c.Param("id")

	var input struct {
		PaymentMethod string `json:"paymentMethod" binding:"required"`
		CouponCode    string `json:"couponCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid input")
		return
	}

	var subject models.Subject
	if err := db.DB.First(&subject, "\"id\" = ?", courseId).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Course not found")
		return
	}

	// For demonstration/initial link, if it's internal_wallet or a simulated success:
	if input.PaymentMethod == "internal_wallet" {
		payment := models.Payment{
			UserID:    userId,
			SubjectID: courseId,
			Amount:    subject.Price,
			Method:    input.PaymentMethod,
			Status:    models.PaymentPending,
			Reference: generateSecureReference("COURSE"),
		}

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

			payment.Status = models.PaymentCompleted
			if err := tx.Create(&payment).Error; err != nil {
				return err
			}

			// Auto-enroll after successful payment
			enrollment := models.Enrollment{
				UserID:     userId,
				SubjectID:  courseId,
				EnrolledAt: time.Now(),
			}
			result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected > 0 {
				if err := tx.Model(&models.Subject{}).
					Where("id = ?", courseId).
					Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1")).Error; err != nil {
					return err
				}
			}

			return nil
		})

		if txErr != nil {
			api_response.Error(c, http.StatusBadRequest, "رصيدك غير كافٍ")
			return
		}

		api_response.Success(c, gin.H{
			"success": true,
			"message": "Payment successful and enrolled",
		})
		return
	}

	// Real Paymob Integration
	if input.PaymentMethod == "card" || input.PaymentMethod == "wallet" || input.PaymentMethod == "fawry" {
		paymobSvc := services.NewPaymobService()
		
		// 1. Authenticate
		token, err := paymobSvc.Authenticate()
		if err != nil {
			log.Printf("Paymob Auth Error: %v", err)
			api_response.Error(c, http.StatusInternalServerError, "فشل الاتصال ببوابة الدفع")
			return
		}

		// 2. Register Order
		amountCents := int64(subject.Price * 100)
		items := []interface{}{
			map[string]interface{}{
				"name":         subject.Name,
				"amount_cents": amountCents,
				"description":  fmt.Sprintf("Course: %s", subject.Name),
				"quantity":     1,
			},
		}
		
		orderID, err := paymobSvc.RegisterOrder(token, amountCents, items)
		if err != nil {
			log.Printf("Paymob Order Error: %v", err)
			api_response.Error(c, http.StatusInternalServerError, "فشل إنشاء طلب الدفع")
			return
		}

		// Get User data for billing
		var user models.User
		db.DB.First(&user, "id = ?", userId)
		
		billingData := map[string]string{
			"first_name":   "Student",
			"last_name":    "User",
			"email":        user.Email,
			"phone_number": "01000000000",
		}
		if user.Name != nil && *user.Name != "" { billingData["first_name"] = *user.Name }
		if user.Phone != nil && *user.Phone != "" { billingData["phone_number"] = *user.Phone }

		// Determine integration ID
		integrationID := paymobSvc.CardIntegrationID
		if input.PaymentMethod == "wallet" {
			integrationID = paymobSvc.WalletIntegrationID
		} else if input.PaymentMethod == "fawry" {
			integrationID = paymobSvc.FawryIntegrationID
		}

		// 3. Generate Payment Key
		paymentKey, err := paymobSvc.GetPaymentKey(token, orderID, amountCents, integrationID, billingData)
		if err != nil {
			log.Printf("Paymob Key Error: %v", err)
			api_response.Error(c, http.StatusInternalServerError, "فشل استخراج مفتاح الدفع")
			return
		}

		// Create pending payment record
		payment := models.Payment{
			UserID:        userId,
			SubjectID:     courseId,
			Amount:        subject.Price,
			Method:        input.PaymentMethod,
			Status:        models.PaymentPending,
			Reference:     generateSecureReference("COURSE"),
			PaymobOrderID: orderID,
		}
		if err := db.DB.Create(&payment).Error; err != nil {
			api_response.Error(c, http.StatusInternalServerError, "Failed to save payment record")
			return
		}

		// For Wallet, we need an extra step to get the redirect URL
		if input.PaymentMethod == "wallet" {
			walletUrl, err := paymobSvc.CreateWalletRequest(paymentKey, billingData["phone_number"])
			if err != nil {
				api_response.Error(c, http.StatusInternalServerError, "فشل معالجة طلب المحفظة")
				return
			}
			api_response.Success(c, gin.H{
				"redirectUrl": walletUrl,
				"orderId":     orderID,
			})
			return
		}

		// For Card/Fawry, return the payment key and iframe ID
		api_response.Success(c, gin.H{
			"paymentKey": paymentKey,
			"iframeId":   paymobSvc.IframeID,
			"orderId":    orderID,
		})
		return
	}

	api_response.Error(c, http.StatusBadRequest, "Unsupported payment method")
}

func UpdateLessonProgress(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		api_response.Error(c, http.StatusUnauthorized, "User not authenticated")
		return
	}
	userId, ok := userIdValue.(string)
	if !ok {
		api_response.Error(c, http.StatusInternalServerError, "Invalid user ID type")
		return
	}
	lessonId := c.Param("id")

	var input struct {
		Completed bool `json:"completed"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid input")
		return
	}

	progress := models.LessonProgress{
		UserID:    userId,
		LessonID:  lessonId,
		Completed: input.Completed,
	}
	if err := db.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "userId"}, {Name: "subTopicId"}},
		DoUpdates: clause.AssignmentColumns([]string{"completed", "updatedAt"}),
	}).Create(&progress).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to save lesson progress: "+err.Error())
		return
	}
 
	api_response.Success(c, nil)
}

// Admin handlers
func CreateSubject(c *gin.Context) {
	var subject models.Subject
	if err := c.ShouldBindJSON(&subject); err != nil {
		log.Printf("CreateSubject: JSON Binding error: %v", err)
		api_response.Error(c, http.StatusBadRequest, "Invalid input format: "+err.Error())
		return
	}

	// Normalize empty fields to nil for optional pointer fields to avoid unique constraint issues with empty strings
	// or potential foreign key issues if the database expects valid IDs or NULL
	if subject.Code != nil && *subject.Code == "" {
		subject.Code = nil
	}
	if subject.Slug != nil && *subject.Slug == "" {
		subject.Slug = nil
	}
	if subject.InstructorId != nil && *subject.InstructorId == "" {
		subject.InstructorId = nil
	}
	if subject.CategoryId != nil && *subject.CategoryId == "" {
		subject.CategoryId = nil
	}

	log.Printf("Attempting to create subject: Name=%s, Code=%v, Slug=%v", subject.Name, subject.Code, subject.Slug)
	if err := getSubjectRepo().Create(&subject); err != nil {
		log.Printf("CreateSubject: Repository error: %v", err)
		errMsg := "Failed to create subject"
		if strings.Contains(err.Error(), "duplicate key") {
			if strings.Contains(err.Error(), "Subject_name_key") {
				errMsg = "A course with this name already exists"
			} else if strings.Contains(err.Error(), "Subject_code_key") {
				errMsg = "A course with this code already exists"
			} else if strings.Contains(err.Error(), "Subject_slug_key") {
				errMsg = "A course with this slug already exists"
			} else {
				errMsg = "A duplicate entry was found"
			}
		}
		api_response.Error(c, http.StatusInternalServerError, errMsg)
		return
	}

	LogAudit(c, "CREATE", "subject", subject.ID, subject)
	api_response.Created(c, gin.H{"course": subject})
}

func UpdateSubject(c *gin.Context) {
	var input map[string]interface{}
	if err := c.ShouldBindJSON(&input); err != nil {
		log.Printf("UpdateSubject: JSON Binding error: %v", err)
		api_response.Error(c, http.StatusBadRequest, "Invalid input format: "+err.Error())
		return
	}

	id, ok := input["id"].(string)
	if !ok || id == "" {
		api_response.Error(c, http.StatusBadRequest, "Subject ID is required")
		return
	}

	var subject models.Subject
	if err := db.DB.First(&subject, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Subject not found")
		return
	}

	// Normalize empty strings to nil for pointer fields in the map
	pointerFields := []string{"code", "slug", "instructorId", "categoryId", "thumbnailUrl", "trailerUrl", "nameAr", "description", "icon", "instructorName", "seoTitle", "seoDescription"}
	for _, field := range pointerFields {
		if val, exists := input[field]; exists {
			if str, ok := val.(string); ok && str == "" {
				input[field] = nil
			}
		}
	}

	log.Printf("Attempting to update subject %s with values: %v", id, input)
	if err := db.DB.Model(&subject).Updates(input).Error; err != nil {
		log.Printf("UpdateSubject: Database error: %v", err)
		errMsg := "Failed to update subject"
		if strings.Contains(err.Error(), "duplicate key") {
			errMsg = "A duplicate entry was found (name, code, or slug already exists)"
		}
		api_response.Error(c, http.StatusInternalServerError, errMsg)
		return
	}

	// Refresh from DB to get all fields
	db.DB.First(&subject, "id = ?", id)
	getSubjectRepo().Update(&subject) // Update cache

	LogAudit(c, "UPDATE", "subject", id, input)
	api_response.Success(c, gin.H{"course": subject})
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
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete subject")
		return
	}

	LogAudit(c, "DELETE", "subject", id, nil)
	api_response.Success(c, nil)
}

func GetSubjectCurriculum(c *gin.Context) {
	id := c.Param("id")
	var subject models.Subject

	if err := db.DB.Preload("Topics.SubTopics").First(&subject, "id = ?", id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, "Subject not found")
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

	api_response.Success(c, gin.H{
		"stats": gin.H{
			"chaptersCount":        chaptersCount,
			"lessonsCount":         lessonsCount,
			"freeLessonsCount":     freeLessonsCount,
			"totalDurationMinutes": totalDuration,
		},
		"topics": subject.Topics,
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

	api_response.Success(c, response)
}

func UpdateCourseCurriculum(c *gin.Context) {
	id := c.Param("id")

	// Accept raw JSON to handle frontend's flexible schema
	var raw map[string]json.RawMessage
	if err := c.ShouldBindJSON(&raw); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid input")
		return
	}

	// Frontend sends either "curriculum" or "topics"
	var chaptersRaw json.RawMessage
	if v, ok := raw["curriculum"]; ok {
		chaptersRaw = v
	} else if v, ok := raw["topics"]; ok {
		chaptersRaw = v
	} else {
		api_response.Error(c, http.StatusBadRequest, "Missing curriculum or topics field")
		return
	}

	// Parse flexible chapter format from frontend
	type incomingLesson struct {
		ID          string  `json:"id"`
		Name        string  `json:"name"`
		Title       string  `json:"title"`
		Order       int     `json:"order"`
		Type        string  `json:"type"`
		VideoUrl    *string `json:"videoUrl"`
		Duration    int     `json:"duration"`
		DurationMin int     `json:"durationMinutes"`
		IsFree      bool    `json:"isFree"`
		Description *string `json:"description"`
	}
	type incomingChapter struct {
		ID        string           `json:"id"`
		Name      string           `json:"name"`
		Title     string           `json:"title"`
		Order     int              `json:"order"`
		SubTopics []incomingLesson `json:"subTopics"`
	}

	var chapters []incomingChapter
	if err := json.Unmarshal(chaptersRaw, &chapters); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid curriculum format: "+err.Error())
		return
	}

	tx := db.DB.Begin()

	// Delete existing topics and subtopics for this subject (clean slate approach)
	// This is simpler and avoids orphaned records
	var existingTopics []models.Topic
	tx.Where("\"subjectId\" = ?", id).Find(&existingTopics)
	for _, t := range existingTopics {
		tx.Where("\"topicId\" = ?", t.ID).Delete(&models.SubTopic{})
	}
	tx.Where("\"subjectId\" = ?", id).Delete(&models.Topic{})

	// Re-create all topics and subtopics from the submitted data
	for i, chapter := range chapters {
		title := chapter.Name
		if title == "" {
			title = chapter.Title
		}

		topic := models.Topic{
			SubjectID: id,
			Title:     title,
			Order:     i,
		}
		// Preserve real IDs, generate new ones for client-created items
		if chapter.ID != "" && !strings.HasPrefix(chapter.ID, "new-") {
			topic.ID = chapter.ID
		}

		if err := tx.Create(&topic).Error; err != nil {
			tx.Rollback()
			log.Printf("Failed to create topic: %v", err)
			api_response.Error(c, http.StatusInternalServerError, "Failed to save chapter: "+title)
			return
		}

		for j, lesson := range chapter.SubTopics {
			lessonTitle := lesson.Name
			if lessonTitle == "" {
				lessonTitle = lesson.Title
			}
			duration := lesson.Duration
			if duration == 0 {
				duration = lesson.DurationMin
			}
			lessonType := models.SubTopicVideo
			if lesson.Type != "" {
				lessonType = models.SubTopicType(lesson.Type)
			}

			st := models.SubTopic{
				TopicID:         topic.ID,
				Title:           lessonTitle,
				Order:           j,
				Type:            lessonType,
				VideoUrl:        lesson.VideoUrl,
				DurationMinutes: duration,
				IsFree:          lesson.IsFree,
				Description:     lesson.Description,
			}
			// Preserve real IDs
			if lesson.ID != "" && !strings.HasPrefix(lesson.ID, "new-") {
				st.ID = lesson.ID
			}

			if err := tx.Create(&st).Error; err != nil {
				tx.Rollback()
				log.Printf("Failed to create subtopic: %v", err)
				api_response.Error(c, http.StatusInternalServerError, "Failed to save lesson: "+lessonTitle)
				return
			}
		}
	}

	if err := tx.Commit().Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to save curriculum changes")
		return
	}

	// Return the updated curriculum
	var subject models.Subject
	if err := db.DB.Preload("Topics.SubTopics").First(&subject, "id = ?", id).Error; err != nil {
		api_response.Success(c, gin.H{"success": true, "message": "Curriculum updated"})
		return
	}

	api_response.Success(c, gin.H{
		"curriculum": subject.Topics,
	})
}

func AddLessonAttachment(c *gin.Context) {
	lessonId := c.Param("id")
	var attachment models.LessonAttachment
	if err := c.ShouldBindJSON(&attachment); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid input")
		return
	}

	attachment.SubTopicID = lessonId
	if err := db.DB.Create(&attachment).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to add attachment")
		return
	}

	api_response.Created(c, attachment)
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

// GetCourseEnrollments returns all students enrolled in a course (Admin only)
func GetCourseEnrollments(c *gin.Context) {
	id := c.Param("id")
	var enrollments []models.Enrollment

	if err := db.DB.Preload("User").Where("\"subjectId\" = ?", id).Order("\"enrolledAt\" desc").Find(&enrollments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch enrollments"})
		return
	}

	api_response.Success(c, gin.H{
		"enrollments": enrollments,
	})
}

// ManualEnroll allows an admin to enroll a user in a course manually
func ManualEnroll(c *gin.Context) {
	id := c.Param("id")
	var input struct {
		UserID string `json:"userId" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User ID is required"})
		return
	}

	// Check if already enrolled
	var existing models.Enrollment
	if err := db.DB.Where("\"userId\" = ? AND \"subjectId\" = ?", input.UserID, id).First(&existing).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already enrolled in this course"})
		return
	}

	enrollment := models.Enrollment{
		UserID:     input.UserID,
		SubjectID:  id,
		EnrolledAt: time.Now(),
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			return tx.Model(&models.Subject{}).
				Where("id = ?", id).
				Update("enrolledCount", gorm.Expr("\"enrolledCount\" + 1")).Error
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll user"})
		return
	}

	api_response.Created(c, enrollment)
}

// UnenrollUser removes a user's enrollment from a course
func UnenrollUser(c *gin.Context) {
	id := c.Param("id")
	userId := c.Param("userId")

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("\"userId\" = ? AND \"subjectId\" = ?", userId, id).Delete(&models.Enrollment{})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected > 0 {
			return tx.Model(&models.Subject{}).
				Where("id = ? AND \"enrolledCount\" > 0", id).
				Update("enrolledCount", gorm.Expr("\"enrolledCount\" - 1")).Error
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unenroll user"})
		return
	}

	api_response.Success(c, nil)
}
