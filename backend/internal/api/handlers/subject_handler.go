package handlers

import (
	"context"
	"encoding/json"
	"fmt"
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

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	idQuery            = "id = ?"
	msgSubjectNotFound     = "Subject not found"
	preloadTopicsSubTopics  = "Topics.SubTopics"
	msgUserNotAuthenticated = "User not authenticated"
	msgInvalidInput         = "Invalid input"
	subjectIDQuery          = "subject_id = ?"
	subjectIDQuotedQuery    = "\"subjectId\" = ?"
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
		query = query.Where("category_id = ?", catID)
	}

	search := c.Query("search")
	if search != "" {
		query = query.Where("name ILIKE ? OR name_ar ILIKE ?", "%"+search+"%", "%"+search+"%")
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
		query = query.Where("is_published = ?", isPublished == "true")
	}
	if isActive := c.Query("isActive"); isActive != "" {
		query = query.Where("is_active = ?", isActive == "true")
	}

	var total int64
	query.Count(&total)

	if err := query.Order("created_at desc").Offset(offset).Limit(limit).Find(&subjects).Error; err != nil {
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
			Select("subject_id, count(*) as count").
			Where("subject_id IN ?", subjectIDs).
			Group("subject_id").
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

	// Support both ID (UUID) and Slug
	query := db.DB.Preload("Topics.SubTopics.Attachments").Preload("Topics.SubTopics.Exam")
	
	// Check if it's a UUID or Slug
	query = applyIDOrSlugQuery(query, id)

	if err := query.First(&subject).Error; err != nil {
		handleSubjectError(c, id, err, "fetching subject")
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

	query := db.DB.Preload(preloadTopicsSubTopics)
	query = applyIDOrSlugQuery(query, id)

	if err := query.First(&subject).Error; err != nil {
		handleSubjectError(c, id, err, "fetching course lessons")
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
			lessons = append(lessons, Lesson{
				ID:              st.ID,
				Title:           st.Title,
				Description:     stringOrEmpty(st.Description),
				VideoUrl:        stringOrEmpty(st.VideoUrl),
				IsFree:          st.IsFree,
				Order:           st.Order,
				DurationMinutes: st.DurationMinutes,
			})
		}
	}

	api_response.Success(c, gin.H{"lessons": lessons})
}

// applyIDOrSlugQuery applies where clause based on whether id is a UUID or a slug
func applyIDOrSlugQuery(query *gorm.DB, id string) *gorm.DB {
	if len(id) == 36 && strings.Contains(id, "-") {
		return query.Where(idQuery, id)
	}
	return query.Where("slug = ? OR id = ?", id, id)
}

func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func EnrollCourse(c *gin.Context) {
	userId, ok := getAuthenticatedUserID(c)
	if !ok {
		return
	}
	courseId := c.Param("id")

	// Ensure the authenticated account exists
	var user models.User
	if err := db.DB.First(&user, idQuery, userId).Error; err != nil {
		log.Printf("[Enrollment] authenticated user was not found in database: %q", userId)
		api_response.Error(c, http.StatusUnauthorized, "User account was not found. Please sign in again or complete registration.")
		return
	}

	// Resolve and verify subject
	var subject models.Subject
	if err := applyIDOrSlugQuery(db.DB, courseId).First(&subject).Error; err != nil {
		handleSubjectError(c, courseId, err, "verifying subject for enrollment")
		return
	}

	// Check if user is already enrolled
	if isAlreadyEnrolled(userId, courseId) {
		api_response.Success(c, gin.H{"success": true, "message": "Already enrolled"})
		return
	}

	// Payment verification logic
	if subject.Price > 0 {
		if !hasPaidForSubject(userId, courseId) {
			api_response.Success(c, gin.H{
				"error":           "Payment required for this course",
				"courseId":        courseId,
				"price":           subject.Price,
				"requiresPayment": true,
			})
			return
		}
	}

	if err := executeEnrollmentTransaction(userId, courseId); err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to enroll: "+err.Error())
		return
	}

	api_response.Success(c, gin.H{"success": true, "message": "Enrolled successfully"})
}

func getAuthenticatedUserID(c *gin.Context) (string, bool) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		api_response.Error(c, http.StatusUnauthorized, msgUserNotAuthenticated)
		return "", false
	}
	userId, ok := userIdValue.(string)
	if !ok {
		api_response.Error(c, http.StatusInternalServerError, "Invalid user ID type")
		return "", false
	}
	return userId, true
}

func handleSubjectError(c *gin.Context, id string, err error, contextMsg string) {
	if err == gorm.ErrRecordNotFound {
		api_response.Error(c, http.StatusNotFound, msgSubjectNotFound)
	} else {
		log.Printf("Error %s %q: %v", contextMsg, id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to "+contextMsg)
	}
}

func isAlreadyEnrolled(userId, subjectId string) bool {
	var enrollment models.Enrollment
	err := db.DB.Where("user_id = ? AND subject_id = ?", userId, subjectId).First(&enrollment).Error
	return err == nil
}

func hasPaidForSubject(userId, subjectId string) bool {
	var payment models.Payment
	err := db.DB.Where("user_id = ? AND subject_id = ? AND status = ?", userId, subjectId, models.PaymentCompleted).First(&payment).Error
	return err == nil
}

func executeEnrollmentTransaction(userId, subjectId string) error {
	return db.DB.Transaction(func(tx *gorm.DB) error {
		return enrollUserInTransaction(tx, userId, subjectId)
	})
}

func enrollUserInTransaction(tx *gorm.DB, userId, subjectId string) error {
	enrollment := models.Enrollment{
		UserID:     userId,
		SubjectID:  subjectId,
		EnrolledAt: time.Now(),
	}

	result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&enrollment)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected > 0 {
		return tx.Model(&models.Subject{}).
			Where(idQuery, subjectId).
			Update("enrolled_count", gorm.Expr("enrolled_count + 1")).Error
	}
	return nil
}

func CourseCheckout(c *gin.Context) {
	userId, ok := getAuthenticatedUserID(c)
	if !ok {
		return
	}
	courseId := c.Param("id")

	var input struct {
		PaymentMethod string `json:"paymentMethod" binding:"required"`
		CouponCode    string `json:"couponCode"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, msgInvalidInput)
		return
	}

	var subject models.Subject
	if err := applyIDOrSlugQuery(db.DB, courseId).First(&subject).Error; err != nil {
		handleSubjectError(c, courseId, err, "fetching course for checkout")
		return
	}

	if input.PaymentMethod == "internal_wallet" {
		processInternalWalletPayment(c, userId, courseId, subject)
		return
	}

	if input.PaymentMethod == "card" || input.PaymentMethod == "wallet" || input.PaymentMethod == "fawry" {
		processPaymobPayment(c, userId, courseId, subject, input.PaymentMethod)
		return
	}

	api_response.Error(c, http.StatusBadRequest, "Unsupported payment method")
}

func processInternalWalletPayment(c *gin.Context, userId string, courseId string, subject models.Subject) {
	payment := models.Payment{
		UserID:    userId,
		SubjectID: &courseId,
		Amount:    subject.Price,
		Method:    "internal_wallet",
		Status:    models.PaymentPending,
		Reference: generateSecureReference("COURSE"),
	}

	txErr := db.DB.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			First(&user, idQuery, userId).Error; err != nil {
			return err
		}

		if user.Balance < subject.Price {
			return gorm.ErrInvalidData // Insufficient balance
		}

		if err := tx.Model(&user).Update("balance", gorm.Expr("balance - ?", subject.Price)).Error; err != nil {
			return err
		}

		payment.Status = models.PaymentCompleted
		if err := tx.Create(&payment).Error; err != nil {
			return err
		}

		return enrollUserInTransaction(tx, userId, courseId)
	})

	if txErr != nil {
		api_response.Error(c, http.StatusBadRequest, "رصيدك غير كافٍ")
		return
	}

	api_response.Success(c, gin.H{
		"success": true,
		"message": "Payment successful and enrolled",
	})
}

func processPaymobPayment(c *gin.Context, userId string, courseId string, subject models.Subject, method string) {
	paymobSvc := services.NewPaymobService()

	token, err := paymobSvc.Authenticate()
	if err != nil {
		log.Printf("Paymob Auth Error: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "فشل الاتصال ببوابة الدفع")
		return
	}

	amountCents := int64(subject.Price * 100)
	orderID, err := paymobSvc.RegisterOrder(token, amountCents, []interface{}{
		map[string]interface{}{
			"name":         subject.Name,
			"amount_cents": amountCents,
			"description":  fmt.Sprintf("Course: %s", subject.Name),
			"quantity":     1,
		},
	})
	if err != nil {
		log.Printf("Paymob Order Error: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "فشل إنشاء طلب الدفع")
		return
	}

	var user models.User
	db.DB.First(&user, idQuery, userId)
	billingData := getBillingData(user)

	integrationID := getIntegrationID(paymobSvc, method)

	paymentKey, err := paymobSvc.GetPaymentKey(token, orderID, amountCents, integrationID, billingData)
	if err != nil {
		log.Printf("Paymob Key Error: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "فشل استخراج مفتاح الدفع")
		return
	}

	if err := createPendingPayment(userId, courseId, subject.Price, method, orderID); err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to save payment record")
		return
	}

	if method == "wallet" {
		handleWalletRedirect(c, paymobSvc, paymentKey, billingData["phone_number"], orderID)
		return
	}

	api_response.Success(c, gin.H{
		"paymentKey": paymentKey,
		"iframeId":   paymobSvc.IframeID,
		"orderId":    orderID,
	})
}

func getBillingData(user models.User) map[string]string {
	billingData := map[string]string{
		"first_name":   "Student",
		"last_name":    "User",
		"email":        user.Email,
		"phone_number": "01000000000",
	}
	if user.Name != nil && *user.Name != "" {
		billingData["first_name"] = *user.Name
	}
	if user.Phone != nil && *user.Phone != "" {
		billingData["phone_number"] = *user.Phone
	}
	return billingData
}

func getIntegrationID(svc *services.PaymobService, method string) string {
	switch method {
	case "wallet":
		return svc.WalletIntegrationID
	case "fawry":
		return svc.FawryIntegrationID
	default:
		return svc.CardIntegrationID
	}
}

func createPendingPayment(userId, courseId string, amount float64, method, orderID string) error {
	payment := models.Payment{
		UserID:        userId,
		SubjectID:     &courseId,
		Amount:        amount,
		Method:        method,
		Status:        models.PaymentPending,
		Reference:     generateSecureReference("COURSE"),
		PaymobOrderID: orderID,
	}
	return db.DB.Create(&payment).Error
}

func handleWalletRedirect(c *gin.Context, svc *services.PaymobService, paymentKey, phone, orderID string) {
	walletUrl, err := svc.CreateWalletRequest(paymentKey, phone)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "فشل معالجة طلب المحفظة")
		return
	}
	api_response.Success(c, gin.H{
		"redirectUrl": walletUrl,
		"orderId":     orderID,
	})
}

func UpdateLessonProgress(c *gin.Context) {
	userId, ok := getAuthenticatedUserID(c)
	if !ok {
		return
	}
	lessonId := c.Param("id")

	var input struct {
		Completed           bool    `json:"completed"`
		LastWatchedPosition float64 `json:"lastWatchedPosition"`
		TimeSpentSeconds    int     `json:"timeSpentSeconds"`
		Status              string  `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		api_response.Error(c, http.StatusBadRequest, msgInvalidInput)
		return
	}

	progressStatus := models.ProgressStatus(input.Status)
	if progressStatus == "" {
		if input.Completed {
			progressStatus = models.ProgressStatusCompleted
		} else {
			progressStatus = models.ProgressStatusInProgress
		}
	}

	progress := models.LessonProgress{
		UserID:              userId,
		LessonID:            lessonId,
		Completed:           input.Completed,
		LastWatchedPosition: int(input.LastWatchedPosition),
		TimeSpentSeconds:    input.TimeSpentSeconds,
		Status:              progressStatus,
	}

	// Create or update, accumulating timeSpentSeconds if it exists.
	// We use raw SQL for accumulation on conflict to be safe and elegant.
	if err := db.DB.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "userId"}, {Name: "subTopicId"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"completed":           input.Completed,
			"lastWatchedPosition": input.LastWatchedPosition,
			"timeSpentSeconds":    gorm.Expr("\"timeSpentSeconds\" + ?", input.TimeSpentSeconds),
			"status":              progressStatus,
			"updatedAt":           time.Now(),
		}),
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

	normalizeSubjectFields(&subject)

	log.Printf("Attempting to create subject: Name=%q, Code=%q, Slug=%q", subject.Name, subject.Code, subject.Slug)
	if err := getSubjectRepo().Create(&subject); err != nil {
		log.Printf("CreateSubject: Repository error: %v", err)
		api_response.Error(c, http.StatusInternalServerError, getCreateSubjectErrorMessage(err))
		return
	}

	LogAudit(c, "CREATE", "subject", subject.ID, subject)
	api_response.Created(c, gin.H{"course": subject})
}

func normalizeSubjectFields(s *models.Subject) {
	if s.Code != nil && *s.Code == "" { s.Code = nil }
	if s.Slug != nil && *s.Slug == "" { s.Slug = nil }
	if s.InstructorId != nil && *s.InstructorId == "" { s.InstructorId = nil }
	if s.CategoryId != nil && *s.CategoryId == "" { s.CategoryId = nil }
}

func getCreateSubjectErrorMessage(err error) string {
	if !strings.Contains(err.Error(), "duplicate key") {
		return "Failed to create subject"
	}
	if strings.Contains(err.Error(), "Subject_name_key") {
		return "A course with this name already exists"
	}
	if strings.Contains(err.Error(), "Subject_code_key") {
		return "A course with this code already exists"
	}
	if strings.Contains(err.Error(), "Subject_slug_key") {
		return "A course with this slug already exists"
	}
	return "A duplicate entry was found"
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
	if err := db.DB.First(&subject, idQuery, id).Error; err != nil {
		api_response.Error(c, http.StatusNotFound, msgSubjectNotFound)
		return
	}

	normalizeInputMap(input)
	updates := mapInputToSubjectUpdates(input)

	if err := db.DB.Model(&models.Subject{}).Where(idQuery, subject.ID).
		Updates(&updates).Error; err != nil {
		log.Printf("UpdateSubject: Database error: %v", err)
		api_response.Error(c, http.StatusInternalServerError, getUpdateSubjectErrorMessage(err))
		return
	}

	// Refresh from DB to get all fields
	db.DB.First(&subject, idQuery, id)
	getSubjectRepo().Update(&subject) // Update cache

	LogAudit(c, "UPDATE", "subject", id, input)
	api_response.Success(c, gin.H{"course": subject})
}

type subjectUpdates struct {
	Name                   *string  `gorm:"column:name"`
	NameAr                 *string  `gorm:"column:name_ar"`
	Description            *string  `gorm:"column:description"`
	CategoryID             *string  `gorm:"column:category_id"`
	Color                  *string  `gorm:"column:color"`
	Image                  *string  `gorm:"column:image"`
	IsPublished            *bool    `gorm:"column:is_published"`
	IsFree                 *bool    `gorm:"column:is_free"`
	Price                  *float64 `gorm:"column:price"`
	Code                   *string  `gorm:"column:code"`
	Icon                   *string  `gorm:"column:icon"`
	InstructorName         *string  `gorm:"column:instructor_name"`
	InstructorID           *string  `gorm:"column:instructor_id"`
	Slug                   *string  `gorm:"column:slug"`
	ThumbnailUrl           *string  `gorm:"column:thumbnail_url"`
	TrailerUrl             *string  `gorm:"column:trailer_url"`
	SeoTitle               *string  `gorm:"column:seo_title"`
	SeoDescription         *string  `gorm:"column:seo_description"`
	TrailerDurationMinutes *int     `gorm:"column:trailer_duration_minutes"`
	Level                  *string  `gorm:"column:level"`
	DurationHours          *float64 `gorm:"column:duration_hours"`
	IsFeatured             *bool    `gorm:"column:is_featured"`
	Language               *string  `gorm:"column:language"`
	Type                   *string  `gorm:"column:type"`
}

func normalizeInputMap(input map[string]interface{}) {
	pointerFields := []string{"code", "slug", "instructorId", "categoryId", "thumbnailUrl", "trailerUrl", "nameAr", "description", "icon", "instructorName", "seoTitle", "seoDescription"}
	for _, field := range pointerFields {
		if val, exists := input[field]; exists {
			if str, ok := val.(string); ok && str == "" {
				input[field] = nil
			}
		}
	}
}

func mapInputToSubjectUpdates(input map[string]interface{}) subjectUpdates {
	updates := subjectUpdates{}
	mapBasicSubjectFields(input, &updates)
	mapSubjectMediaAndInstructorFields(input, &updates)
	mapSubjectMetadataFields(input, &updates)
	mapSubjectFinancialAndStatusFields(input, &updates)
	return updates
}

func mapBasicSubjectFields(input map[string]interface{}, updates *subjectUpdates) {
	if v, ok := input["name"].(string); ok {
		updates.Name = &v
	}
	if v, ok := input["nameAr"].(string); ok {
		updates.NameAr = &v
	}
	if v, ok := input["description"].(string); ok {
		updates.Description = &v
	}
	if v, ok := input["categoryId"].(string); ok {
		updates.CategoryID = &v
	}
	if v, ok := input["color"].(string); ok {
		updates.Color = &v
	}
	if v, ok := input["icon"].(string); ok {
		updates.Icon = &v
	}
	if v, ok := input["code"].(string); ok {
		updates.Code = &v
	}
	if v, ok := input["slug"].(string); ok {
		updates.Slug = &v
	}
}

func mapSubjectMediaAndInstructorFields(input map[string]interface{}, updates *subjectUpdates) {
	if v, ok := input["thumbnailUrl"].(string); ok {
		updates.ThumbnailUrl = &v
	}
	if v, ok := input["trailerUrl"].(string); ok {
		updates.TrailerUrl = &v
	}
	if v, ok := input["instructorName"].(string); ok {
		updates.InstructorName = &v
	}
	if v, ok := input["instructorId"].(string); ok {
		updates.InstructorID = &v
	}
}

func mapSubjectMetadataFields(input map[string]interface{}, updates *subjectUpdates) {
	if v, ok := input["seoTitle"].(string); ok {
		updates.SeoTitle = &v
	}
	if v, ok := input["seoDescription"].(string); ok {
		updates.SeoDescription = &v
	}
	if v, ok := input["level"].(string); ok {
		updates.Level = &v
	}
	if v, ok := input["language"].(string); ok {
		updates.Language = &v
	}
	if v, ok := input["type"].(string); ok {
		updates.Type = &v
	}
}

func mapSubjectFinancialAndStatusFields(input map[string]interface{}, updates *subjectUpdates) {
	if v, ok := input["price"].(float64); ok {
		updates.Price = &v
	}
	if v, ok := input["durationHours"].(float64); ok {
		updates.DurationHours = &v
	}
	if v, ok := input["trailerDurationMinutes"].(float64); ok {
		i := int(v)
		updates.TrailerDurationMinutes = &i
	}
	if v, ok := input["isPublished"].(bool); ok {
		updates.IsPublished = &v
	}
	if v, ok := input["isFree"].(bool); ok {
		updates.IsFree = &v
	}
	if v, ok := input["isFeatured"].(bool); ok {
		updates.IsFeatured = &v
	}
}


func getUpdateSubjectErrorMessage(err error) string {
	if strings.Contains(err.Error(), "duplicate key") {
		return "A duplicate entry was found (name, code, or slug already exists)"
	}
	return "Failed to update subject"
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

	log.Printf("Attempting to delete subject with ID: %q", id)

	// First, check if subject exists
	var subject models.Subject
	if err := db.DB.First(&subject, idQuery, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			api_response.Error(c, http.StatusNotFound, msgSubjectNotFound)
			return
		}
		log.Printf("Error checking subject existence: %v", err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to verify subject")
		return
	}

	// Delete in transaction to ensure atomicity
	tx := db.DB.Begin()
	defer tx.Rollback()

	// Delete related records that don't have CASCADE constraints
	// Delete StudySessions referencing this subject
	if err := tx.Where(subjectIDQuery, id).Delete(&models.StudySession{}).Error; err != nil {
		tx.Rollback()
		log.Printf("Error deleting study sessions for subject %q: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete related study sessions")
		return
	}

	// Delete Books referencing this subject
	if err := tx.Where(subjectIDQuery, id).Delete(&models.Book{}).Error; err != nil {
		tx.Rollback()
		log.Printf("Error deleting books for subject %q: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete related books")
		return
	}

	// Delete Challenges referencing this subject
	if err := tx.Where(subjectIDQuery, id).Delete(&models.Challenge{}).Error; err != nil {
		tx.Rollback()
		log.Printf("Error deleting challenges for subject %q: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete related challenges")
		return
	}

	// Delete Payments referencing this subject (set to null instead of delete)
	if err := tx.Model(&models.Payment{}).Where(subjectIDQuery, id).Update("subject_id", nil).Error; err != nil {
		tx.Rollback()
		log.Printf("Error updating payments for subject %q: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to update related payments")
		return
	}

	// Now delete the subject (Topics, Enrollments will be cascade deleted)
	if err := tx.Delete(&subject).Error; err != nil {
		tx.Rollback()
		log.Printf("Error deleting subject %q: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to delete subject: "+err.Error())
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		log.Printf("Error committing transaction for subject %q deletion: %v", id, err)
		api_response.Error(c, http.StatusInternalServerError, "Failed to complete deletion")
		return
	}

	// Clear cache
	if db.Redis != nil {
		ctx := context.Background()
		db.Redis.Del(ctx, fmt.Sprintf("%sid:%s", repository.SubjectCachePrefix, id))
	}

	LogAudit(c, "DELETE", "subject", id, nil)
	log.Printf("Successfully deleted subject: %q (%q)", id, subject.Name)
	api_response.Success(c, gin.H{"message": "Subject deleted successfully"})
}

func GetSubjectCurriculum(c *gin.Context) {
	id := c.Param("id")
	var subject models.Subject

	query := db.DB.Preload(preloadTopicsSubTopics)
	query = applyIDOrSlugQuery(query, id)

	if err := query.First(&subject).Error; err != nil {
		handleSubjectError(c, id, err, "fetching curriculum for subject")
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
	userId, ok := getAuthenticatedUserID(c)
	if !ok {
		return
	}

	var enrollments []models.Enrollment
	if err := db.DB.Preload("Subject").Where("user_id = ?", userId).Find(&enrollments).Error; err != nil {
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
	var raw map[string]json.RawMessage
	if err := c.ShouldBindJSON(&raw); err != nil {
		api_response.Error(c, http.StatusBadRequest, msgInvalidInput)
		return
	}

	chaptersRaw, err := extractChaptersRaw(raw)
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var chapters []incomingChapter
	if err := json.Unmarshal(chaptersRaw, &chapters); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid curriculum format: "+err.Error())
		return
	}

	if err := db.DB.Transaction(func(tx *gorm.DB) error {
		clearSubjectCurriculum(tx, id)
		for i, chapter := range chapters {
			if err := createTopicFromIncoming(tx, id, chapter, i); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to save curriculum: "+err.Error())
		return
	}

	getSubjectRepo().InvalidateSubjectCache(id)

	var subject models.Subject
	if err := db.DB.Preload(preloadTopicsSubTopics).First(&subject, idQuery, id).Error; err != nil {
		api_response.Success(c, gin.H{"success": true, "message": "Curriculum updated"})
		return
	}

	api_response.Success(c, gin.H{"curriculum": subject.Topics})
}

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

func extractChaptersRaw(raw map[string]json.RawMessage) (json.RawMessage, error) {
	if v, ok := raw["curriculum"]; ok {
		return v, nil
	}
	if v, ok := raw["topics"]; ok {
		return v, nil
	}
	return nil, fmt.Errorf("Missing curriculum or topics field")
}

func clearSubjectCurriculum(tx *gorm.DB, subjectId string) {
	var existingTopics []models.Topic
	tx.Where(subjectIDQuotedQuery, subjectId).Find(&existingTopics)
	for _, t := range existingTopics {
		tx.Where("\"topicId\" = ?", t.ID).Delete(&models.SubTopic{})
	}
	tx.Where(subjectIDQuotedQuery, subjectId).Delete(&models.Topic{})
}

func createTopicFromIncoming(tx *gorm.DB, subjectId string, chapter incomingChapter, order int) error {
	title := chapter.Name
	if title == "" {
		title = chapter.Title
	}
	topic := models.Topic{
		SubjectID: subjectId,
		Title:     title,
		Order:     order,
	}
	if chapter.ID != "" && !strings.HasPrefix(chapter.ID, "new-") {
		topic.ID = chapter.ID
	}

	if err := tx.Create(&topic).Error; err != nil {
		return err
	}

	for j, lesson := range chapter.SubTopics {
		if err := createSubTopicFromIncoming(tx, topic.ID, lesson, j); err != nil {
			return err
		}
	}
	return nil
}

func createSubTopicFromIncoming(tx *gorm.DB, topicId string, lesson incomingLesson, order int) error {
	title := lesson.Name
	if title == "" {
		title = lesson.Title
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
		TopicID:         topicId,
		Title:           title,
		Order:           order,
		Type:            lessonType,
		VideoUrl:        lesson.VideoUrl,
		DurationMinutes: duration,
		IsFree:          lesson.IsFree,
		Description:     lesson.Description,
	}
	if lesson.ID != "" && !strings.HasPrefix(lesson.ID, "new-") {
		st.ID = lesson.ID
	}

	return tx.Create(&st).Error
}

func AddLessonAttachment(c *gin.Context) {
	lessonId := c.Param("id")
	var attachment models.LessonAttachment
	if err := c.ShouldBindJSON(&attachment); err != nil {
		api_response.Error(c, http.StatusBadRequest, msgInvalidInput)
		return
	}

	attachment.SubTopicID = lessonId
	if err := db.DB.Create(&attachment).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to add attachment")
		return
	}

	// Invalidate parent subject cache
	var subTopic models.SubTopic
	if err := db.DB.First(&subTopic, idQuery, lessonId).Error; err == nil {
		var topic models.Topic
		if err := db.DB.First(&topic, idQuery, subTopic.TopicID).Error; err == nil && topic.SubjectID != "" {
			getSubjectRepo().InvalidateSubjectCache(topic.SubjectID)
		}
	}

	api_response.Created(c, attachment)
}

func CreateCourseReview(c *gin.Context) {
	userId, _ := c.Get("userId")
	subjectId := c.Param("id")

	var review models.CourseReview
	if err := c.ShouldBindJSON(&review); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": msgInvalidInput})
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
	db.DB.Model(&models.CourseReview{}).Where(subjectIDQuotedQuery, subjectId).Select("avg(rating)").Scan(&avg)
	db.DB.Model(&models.Subject{}).Where(idQuery, subjectId).Update("rating", avg)

	c.JSON(http.StatusCreated, review)
}

func GetCourseReviews(c *gin.Context) {
	id := c.Param("id")
	var reviews []models.CourseReview

	// Resolve subject first if it's a slug
	var subject models.Subject
	query := db.DB.Select("id")
	query = applyIDOrSlugQuery(query, id)

	if err := query.First(&subject).Error; err != nil {
		handleSubjectError(c, id, err, "resolving subject for reviews")
		return
	}

	if err := db.DB.Preload("User").Where("subject_id = ? AND is_visible = ?", subject.ID, true).Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}

	c.JSON(http.StatusOK, reviews)
}

// GetCourseEnrollments returns all students enrolled in a course (Admin only)
func GetCourseEnrollments(c *gin.Context) {
	id := c.Param("id")
	var enrollments []models.Enrollment

	// Resolve subject first
	var subject models.Subject
	query := db.DB.Select("id")
	query = applyIDOrSlugQuery(query, id)

	if err := query.First(&subject).Error; err != nil {
		handleSubjectError(c, id, err, "resolving subject for enrollments")
		return
	}

	if err := db.DB.Preload("User").Where(subjectIDQuery, subject.ID).Order("enrolled_at desc").Find(&enrollments).Error; err != nil {
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
	if isAlreadyEnrolled(input.UserID, id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is already enrolled in this course"})
		return
	}

	if err := executeEnrollmentTransaction(input.UserID, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enroll user"})
		return
	}

	api_response.Created(c, nil)
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
				Where("id = ? AND enrolled_count > 0", id).
				Update("enrolled_count", gorm.Expr("enrolled_count - 1")).Error
		}
		return nil
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unenroll user"})
		return
	}

	api_response.Success(c, nil)
}
