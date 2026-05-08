package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"encoding/csv"
	"encoding/json"
	"io"
	"sort"
	"strings"

	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
	"thanawy-backend/internal/storage"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"runtime"
)

// AdminAI handles all AI-related admin operations
func AdminAIGet(c *gin.Context) {
	var riskStudents []models.User
	db.DB.Where(statusQuery, models.StatusInactive).Limit(5).Find(&riskStudents)

	var subjects []models.Subject
	db.DB.Limit(10).Find(&subjects)

	riskItems := make([]gin.H, 0, len(riskStudents))
	for _, s := range riskStudents {
		daysSinceUpdate := int(time.Since(s.UpdatedAt).Hours() / 24)
		riskScore := 60 + (daysSinceUpdate / 2)
		if riskScore > 98 {
			riskScore = 98
		}

		riskItems = append(riskItems, gin.H{
			"id":         s.ID,
			"name":       firstNonEmpty(stringOrEmpty(s.Name), stringOrEmpty(s.Username), s.Email),
			"riskScore":  riskScore,
			"gradeLevel": s.GradeLevel,
			"reasons":    []string{"انقطاع عن النشاط", fmt.Sprintf("آخر تواجد منذ %d يوم", daysSinceUpdate)},
		})
	}

	subjectItems := make([]gin.H, 0, len(subjects))
	for _, s := range subjects {
		subjectItems = append(subjectItems, gin.H{
			"id":   s.ID,
			"name": s.Name,
		})
	}

	api_response.Success(c, gin.H{
		"riskStudents": riskItems,
		"reviewQueue":  []interface{}{},
		"subjects":     subjectItems,
		"summary": gin.H{
			"highRiskCount":      len(riskItems),
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
		api_response.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	switch req.Action {
	case "copilot":
		apiKey := os.Getenv("OPENROUTER_API_KEY")
		if apiKey == "" {
			api_response.Success(c, gin.H{
				"message": "أنا مستشار المملكة الذكي. هذه ميزة تجريبية وسأكون متاحاً قريباً بشكل كامل.",
			})
			return
		}

		// Build admin context
		var totalUsers int64
		var totalSubjects int64
		db.DB.Model(&models.User{}).Count(&totalUsers)
		db.DB.Model(&models.Subject{}).Count(&totalSubjects)

		systemPrompt := fmt.Sprintf(`أنت مستشار ذكي لإدارة منصة "ثانوي" التعليمية.
لديك حالياً %d مستخدم و %d مادة دراسية.
ساعد المدير في اتخاذ القرارات وتحليل البيانات وتقديم الاقتراحات.
أجب بالعربية بشكل مختصر ومفيد.`, totalUsers, totalSubjects)

		messages := []map[string]interface{}{
			{"role": "system", "content": systemPrompt},
			{"role": "user", "content": req.Prompt},
		}

		// Use the same AI calling pattern as AIChatProxy
		aiHandler := NewAIHandler()
		reply, _, err := aiHandler.callAIWithRetryCustom(messages, "google/gemini-2.0-flash-001")
		if err != nil {
			api_response.Success(c, gin.H{
				"message": "عذراً، حدث خطأ في الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.",
			})
			return
		}

		api_response.Success(c, gin.H{"message": reply})

	case "generate_content":
		api_response.Success(c, gin.H{"message": "تم إنشاء المحتوى بنجاح"})
	case "review_content":
		api_response.Success(c, nil)
	default:
		api_response.Error(c, http.StatusBadRequest, "Unknown action")
	}
}

func AdminBulkSendMessage(c *gin.Context) {
	var req struct {
		Message   string   `json:"message" binding:"required"`
		Title     string   `json:"title"`
		Type      string   `json:"type"`
		UserIDs   []string `json:"userIds"`
		Role      string   `json:"role"`
		ActionURL string   `json:"actionUrl"`
		Channels  []string `json:"channels"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := validateBulkMessageChannels(req.Channels); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	targetUsers, err := fetchBulkMessageTargetUsers(req.UserIDs, req.Role)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	notificationType := parseNotificationType(req.Type)
	title := req.Title
	if title == "" {
		title = "رسالة من الإدارة"
	}

	notifications := prepareBulkNotifications(targetUsers, title, req.Message, notificationType, req.ActionURL, req.Channels)

	if len(notifications) > 0 {
		if err := db.DB.CreateInBatches(&notifications, 100).Error; err != nil {
			log.Printf("ERROR: Failed to create notifications in bulk: %v", err)
			api_response.Error(c, http.StatusInternalServerError, "Failed to create notifications: "+err.Error())
			return
		}
	}

	sendBulkEmailsBackground(targetUsers, title, req.Message, req.ActionURL, req.Channels)

	LogAudit(c, "BULK_SEND_MESSAGE", "notification", "", gin.H{
		"targetCount": len(targetUsers),
		"channels":    req.Channels,
		"appCount":    len(notifications),
		"queued":      true,
	})

	api_response.Success(c, gin.H{
		"summary": gin.H{
			"success": len(notifications),
			"failure": 0,
			"total":   len(targetUsers),
		},
		"message": fmt.Sprintf("تم إرسال %d رسالة بنجاح", len(notifications)),
	})
	LogAudit(c, "BULK_SEND_MESSAGE", "notification", "", req)
}

func validateBulkMessageChannels(channels []string) error {
	if len(channels) == 0 {
		return nil
	}
	validChannels := map[string]bool{"app": true, "email": true, "sms": true}
	for _, channel := range channels {
		if !validChannels[channel] {
			return fmt.Errorf("Invalid channel: %s", channel)
		}
	}
	return nil
}

func fetchBulkMessageTargetUsers(userIDs []string, role string) ([]models.User, error) {
	var targetUsers []models.User
	query := db.DB.Model(&models.User{})
	if len(userIDs) > 0 {
		query = query.Where(idInQuery, userIDs)
	} else if role != "" {
		query = query.Where("role = ?", role)
	}

	if err := query.Find(&targetUsers).Error; err != nil {
		return nil, fmt.Errorf("Failed to fetch target users")
	}
	return targetUsers, nil
}

func parseNotificationType(t string) models.NotificationType {
	switch t {
	case "success":
		return models.NotificationSuccess
	case "warning":
		return models.NotificationWarning
	case "error":
		return models.NotificationError
	default:
		return models.NotificationInfo
	}
}

func prepareBulkNotifications(users []models.User, title, message string, nType models.NotificationType, actionURL string, channels []string) []models.Notification {
	notifications := make([]models.Notification, 0, len(users))
	shouldAddLink := actionURL != "" && (len(channels) == 0 || contains(channels, "app"))

	for _, u := range users {
		notification := models.Notification{
			UserID:  u.ID,
			Title:   title,
			Message: message,
			Type:    nType,
		}
		if shouldAddLink {
			link := actionURL
			notification.Link = &link
		}
		notifications = append(notifications, notification)
	}
	return notifications
}

func sendBulkEmailsBackground(users []models.User, title, message, url string, channels []string) {
	go func() {
		emailService := services.GetEmailService()
		for _, u := range users {
			if len(channels) == 0 || contains(channels, "email") {
				if emailService.ValidateEmail(u.Email) {
					emailBody := emailService.BuildNotificationEmail(title, message, url)
					_ = emailService.SendEmail(u.Email, title, emailBody, true)
				}
			}
		}
	}()
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func Upload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, "No file uploaded")
		return
	}

	uploadDir := "uploads"
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		err = os.MkdirAll(uploadDir, 0755)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
			return
		}
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))

	allowedExts := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true,
		".pdf": true, ".doc": true, ".docx": true,
		".mp4": true, ".mp3": true,
	}

	if !allowedExts[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed"})
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	
	f, err := file.Open()
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to open file")
		return
	}
	defer f.Close()

	url, err := storage.GlobalStorage.Upload(c.Request.Context(), filename, f, file.Size, file.Header.Get("Content-Type"))
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to upload file")
		return
	}

	api_response.Success(c, gin.H{
		"fileUrl": url,
	})
}

func AdminExamsBulkUpload(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, "No file uploaded")
		return
	}

	subjectID := c.PostForm("subjectId")
	examTitle := c.PostForm("title")
	if subjectID == "" || examTitle == "" {
		api_response.Error(c, http.StatusBadRequest, "Subject ID and Exam Title are required")
		return
	}

	f, err := file.Open()
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to open file")
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	records, err := reader.ReadAll()
	if err != nil {
		api_response.Error(c, http.StatusBadRequest, "Failed to parse CSV")
		return
	}

	if len(records) < 2 {
		api_response.Error(c, http.StatusBadRequest, "CSV is empty or missing headers")
		return
	}

	exam := models.Exam{
		SubjectID: subjectID,
		Title:     examTitle,
		Type:      models.ExamTypeQuiz,
	}
	if err := db.DB.Create(&exam).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create exam")
		return
	}

	importedCount := 0
	for i := 1; i < len(records); i++ {
		row := records[i]
		if len(row) < 6 {
			continue
		}

		text := row[0]
		options := []string{row[1], row[2], row[3], row[4]}
		answer := row[5]

		optionsJSON, _ := json.Marshal(options)

		question := models.Question{
			ExamID:  exam.ID,
			Text:    text,
			Options: string(optionsJSON),
			Answer:  answer,
		}

		if err := db.DB.Create(&question).Error; err == nil {
			importedCount++
		}
	}

	api_response.Success(c, gin.H{
		"examId":   exam.ID,
		"imported": importedCount,
		"message":  fmt.Sprintf("تم استيراد %d سؤال بنجاح في اختبار %s", importedCount, examTitle),
	})
	LogAudit(c, "BULK_UPLOAD_EXAM", "exam", exam.ID, gin.H{"importedCount": importedCount})
}

func UploadChunked(c *gin.Context) {
	ctx := c.Request.Context()
	switch c.Request.Method {
	case http.MethodPost:
		var req struct {
			FileName  string `json:"fileName"`
			FileType  string `json:"fileType"`
			FileSize  int64  `json:"fileSize"`
			ChunkSize int    `json:"chunkSize"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			api_response.Error(c, http.StatusBadRequest, "Invalid request parameters")
			return
		}

		uploadID := uuid.New().String()
		
		// Store metadata in Redis for distributed access
		metadataBytes, _ := json.Marshal(req)
		if db.Redis != nil {
			db.Redis.Set(ctx, "upload_metadata:"+uploadID, metadataBytes, 24*time.Hour)
		} else {
			// Fallback to local if Redis is missing (not ideal for distributed)
			tempDir := filepath.Join("uploads", "temp", uploadID)
			os.MkdirAll(tempDir, 0755)
			os.WriteFile(filepath.Join(tempDir, "metadata.json"), metadataBytes, 0644)
		}

		api_response.Success(c, gin.H{"uploadId": uploadID})

	case http.MethodPut:
		uploadID := c.PostForm("uploadId")
		chunkIndexStr := c.PostForm("chunkIndex")
		if uploadID == "" || chunkIndexStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing uploadId or chunkIndex"})
			return
		}

		file, err := c.FormFile("chunk")
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No chunk file found in request"})
			return
		}

		f, err := file.Open()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to open chunk"})
			return
		}
		defer f.Close()

		// Upload chunk to distributed storage
		chunkPath := fmt.Sprintf("temp/%s/%s", uploadID, chunkIndexStr)
		_, err = storage.GlobalStorage.Upload(ctx, chunkPath, f, file.Size, "application/octet-stream")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save chunk to storage", "details": err.Error()})
			return
		}

		api_response.Success(c, nil)

	case http.MethodPatch:
		var req struct {
			UploadID string `json:"uploadId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Retrieve metadata
		var metadata struct {
			FileName string `json:"fileName"`
			FileType string `json:"fileType"`
		}
		
		if db.Redis != nil {
			val, err := db.Redis.Get(ctx, "upload_metadata:"+req.UploadID).Bytes()
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired uploadId"})
				return
			}
			json.Unmarshal(val, &metadata)
		} else {
			// Fallback
			tempDir := filepath.Join("uploads", "temp", req.UploadID)
			metadataBytes, err := os.ReadFile(filepath.Join(tempDir, "metadata.json"))
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired uploadId"})
				return
			}
			json.Unmarshal(metadataBytes, &metadata)
		}

		// List chunks from distributed storage
		chunkPrefix := fmt.Sprintf("temp/%s/", req.UploadID)
		chunkFiles, err := storage.GlobalStorage.List(ctx, chunkPrefix)
		if err != nil || len(chunkFiles) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No chunks found for this upload"})
			return
		}

		type chunkEntry struct {
			index int
			path  string
		}
		var chunks []chunkEntry
		for _, path := range chunkFiles {
			// Path usually looks like "temp/{uploadID}/{index}"
			parts := strings.Split(path, "/")
			if len(parts) < 3 { continue }
			idx, err := strconv.Atoi(parts[len(parts)-1])
			if err != nil { continue }
			chunks = append(chunks, chunkEntry{index: idx, path: path})
		}

		sort.Slice(chunks, func(i, j int) bool {
			return chunks[i].index < chunks[j].index
		})

		// Join chunks into a temporary local file
		ext := strings.ToLower(filepath.Ext(metadata.FileName))
		finalFilename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
		
		tempLocalFile, err := os.CreateTemp("", "upload-*"+ext)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create merge buffer"})
			return
		}
		tempLocalPath := tempLocalFile.Name()
		defer os.Remove(tempLocalPath)

		for _, chunk := range chunks {
			rc, err := storage.GlobalStorage.Download(ctx, chunk.path)
			if err != nil {
				tempLocalFile.Close()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to download chunk " + chunk.path})
				return
			}
			_, err = io.Copy(tempLocalFile, rc)
			rc.Close()
			if err != nil {
				tempLocalFile.Close()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join chunk " + chunk.path})
				return
			}
		}
		
		// Get size for final upload
		info, _ := tempLocalFile.Stat()
		size := info.Size()
		tempLocalFile.Seek(0, 0)

		// Upload final file
		url, err := storage.GlobalStorage.Upload(ctx, finalFilename, tempLocalFile, size, metadata.FileType)
		tempLocalFile.Close()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload final file"})
			return
		}

		// Cleanup
		go func() {
			bgCtx := context.Background()
			for _, chunk := range chunks {
				storage.GlobalStorage.Delete(bgCtx, chunk.path)
			}
			if db.Redis != nil {
				db.Redis.Del(bgCtx, "upload_metadata:"+req.UploadID)
			}
			// Cleanup local temp if fallback was used
			os.RemoveAll(filepath.Join("uploads", "temp", req.UploadID))
		}()

		api_response.Success(c, gin.H{"fileUrl": url})

	default:
		c.JSON(http.StatusMethodNotAllowed, gin.H{"error": "Method not allowed"})
	}
}

func MarkActivityRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	activityID := c.Param("id")
	if activityID == "" {
		var req struct {
			ActivityID string `json:"activityId"`
		}
		if err := c.ShouldBindJSON(&req); err == nil && req.ActivityID != "" {
			activityID = req.ActivityID
		}
	}

	if activityID == "" {
		api_response.Error(c, http.StatusBadRequest, msgIDRequired)
		return
	}

	if err := db.DB.Model(&models.Notification{}).Where("id = ? AND user_id = ?", activityID, userId).Update("is_read", true).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update activity")
		return
	}

	api_response.Success(c, nil)
}

func MarkAllActivitiesRead(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if err := db.DB.Model(&models.Notification{}).Where("user_id = ?", userId).Update("is_read", true).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to update activities")
		return
	}

	api_response.Success(c, nil)
}

func GetAIRecommendations(c *gin.Context) {
	_, exists := c.Get("userId")
	if !exists {
		api_response.Success(c, gin.H{
			"recommendations": []interface{}{},
			"message":         "Please login to see personalized recommendations",
		})
		return
	}

	api_response.Success(c, gin.H{
		"recommendations": []interface{}{},
		"message":         "AI recommendations not yet implemented",
	})
}

func TrackAIRecommendation(c *gin.Context) {
	var req struct {
		RecommendationID string `json:"recommendationId" binding:"required"`
		Action           string `json:"action"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	api_response.Success(c, gin.H{"success": true})
}

func ValidateCoupon(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var coupon models.Coupon
	if err := db.DB.Where("code = ? AND is_active = ?", req.Code, true).First(&coupon).Error; err != nil {
		api_response.Success(c, gin.H{
			"valid":   false,
			"message": "كود الخصم غير صالح",
		})
		return
	}

	if coupon.ExpiryDate != nil && coupon.ExpiryDate.Before(time.Now()) {
		api_response.Success(c, gin.H{
			"valid":   false,
			"message": "كود الخصم منتهي الصلاحية",
		})
		return
	}

	if coupon.MaxUses != nil && coupon.UsedCount >= *coupon.MaxUses {
		api_response.Success(c, gin.H{
			"valid":   false,
			"message": "تم استنفاذ عدد مرات استخدام الكود",
		})
		return
	}

	api_response.Success(c, gin.H{
		"valid":        true,
		"discountType": coupon.DiscountType,
		"discount":     coupon.DiscountValue,
		"message":      "تم تطبيق الخصم بنجاح",
	})
}

func SubscriptionCheckout(c *gin.Context) {
	userId, exists := c.Get("userId")
	if !exists {
		api_response.Error(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		PlanID        string `json:"planId" binding:"required"`
		PaymentMethod string `json:"paymentMethod" binding:"required"`
		CouponCode    string `json:"couponCode"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	planPrices := map[string]float64{
		"basic": 150,
		"pro":   350,
		"elite": 600,
	}

	price, ok := planPrices[req.PlanID]
	if !ok {
		api_response.Error(c, http.StatusBadRequest, "Invalid plan ID")
		return
	}

	// Apply coupon discount if provided
	var appliedCoupon *models.Coupon
	if req.CouponCode != "" {
		var coupon models.Coupon
		if err := db.DB.Where("code = ? AND is_active = ?", req.CouponCode, true).First(&coupon).Error; err == nil {
			// Validate coupon
			valid := true
			if coupon.ExpiryDate != nil && coupon.ExpiryDate.Before(time.Now()) {
				valid = false
			}
			if coupon.MaxUses != nil && coupon.UsedCount >= *coupon.MaxUses {
				valid = false
			}
			if coupon.MinOrderAmount > 0 && price < coupon.MinOrderAmount {
				valid = false
			}

			if valid {
				if coupon.DiscountType == "PERCENTAGE" {
					price = price * (1 - coupon.DiscountValue/100)
				} else {
					price = price - coupon.DiscountValue
				}
				if price < 0 {
					price = 0
				}
				appliedCoupon = &coupon
			}
		}
	}

	paymobSvc := services.NewPaymobService()

	token, err := paymobSvc.Authenticate()
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "فشل الاتصال ببوابة الدفع")
		return
	}

	amountCents := int64(price * 100)
	items := []interface{}{
		map[string]interface{}{
			"name":         fmt.Sprintf("Subscription: %s", req.PlanID),
			"amount_cents": amountCents,
			"description":  fmt.Sprintf("Plan ID: %s", req.PlanID),
			"quantity":     1,
		},
	}

	orderID, err := paymobSvc.RegisterOrder(token, amountCents, items)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "فشل إنشاء طلب الدفع")
		return
	}

	var user models.User
	db.DB.First(&user, "id = ?", userId)

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

	integrationID := paymobSvc.CardIntegrationID
	switch req.PaymentMethod {
	case "wallet":
		integrationID = paymobSvc.WalletIntegrationID
	case "fawry":
		integrationID = paymobSvc.FawryIntegrationID
	}

	paymentKey, err := paymobSvc.GetPaymentKey(token, orderID, amountCents, integrationID, billingData)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "فشل استخراج مفتاح الدفع")
		return
	}

	payment := models.Payment{
		UserID:        userId.(string),
		Amount:        price,
		Method:        req.PaymentMethod,
		Status:        models.PaymentPending,
		Reference:     fmt.Sprintf("SUB-%d", time.Now().Unix()),
		PaymobOrderID: orderID,
	}
	if err := db.DB.Create(&payment).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to save payment record")
		return
	}

	// Increment coupon used count
	if appliedCoupon != nil {
		db.DB.Model(appliedCoupon).UpdateColumn("used_count", appliedCoupon.UsedCount+1)
	}

	if req.PaymentMethod == "wallet" {
		walletUrl, _ := paymobSvc.CreateWalletRequest(paymentKey, billingData["phone_number"])
		api_response.Success(c, gin.H{"redirectUrl": walletUrl, "orderId": orderID})
		return
	}

	api_response.Success(c, gin.H{
		"paymentKey": paymentKey,
		"iframeId":   paymobSvc.IframeID,
		"orderId":    orderID,
	})
}

func CreateLibraryBook(c *gin.Context) {
	var book models.Book

	if strings.Contains(c.GetHeader("Content-Type"), "multipart/form-data") {
		book.Title = c.PostForm("title")
		book.Author = c.PostForm("author")
		book.Description = c.PostForm("description")
		subjectId := c.PostForm("subjectId")
		if subjectId != "" {
			book.SubjectID = &subjectId
		}

		price, _ := strconv.ParseFloat(c.PostForm("price"), 64)
		book.Price = price
		book.IsFree = c.PostForm("isFree") == "true"

		cover, err := c.FormFile("cover")
		if err == nil {
			ext := filepath.Ext(cover.Filename)
			filename := fmt.Sprintf("book_cover_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(cover, dst); err == nil {
				book.CoverUrl = "/uploads/" + filename
			}
		}

		file, err := c.FormFile("file")
		if err == nil {
			ext := filepath.Ext(file.Filename)
			filename := fmt.Sprintf("book_%d%s", time.Now().UnixNano(), ext)
			dst := filepath.Join("uploads", filename)
			if err := c.SaveUploadedFile(file, dst); err == nil {
				book.DownloadUrl = "/uploads/" + filename
			}
		}
	} else {
		if err := c.ShouldBindJSON(&book); err != nil {
			api_response.Error(c, http.StatusBadRequest, err.Error())
			return
		}
	}

	if book.Title == "" {
		api_response.Error(c, http.StatusBadRequest, "Book title is required")
		return
	}

	if err := db.DB.Create(&book).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to create book record")
		return
	}

	api_response.Created(c, book)
}

func GetLibraryCategories(c *gin.Context) {
	var categories []models.Category
	if err := db.DB.Where("type = ?", "LIBRARY").Find(&categories).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch library categories")
		return
	}

	api_response.Success(c, categories)
}

func DeleteImpersonation(c *gin.Context) {
	c.SetCookie("impersonate_user_id", "", -1, "/", "", isProduction(), true)
	api_response.Success(c, gin.H{
		"message": "تم إنهاء جلسة انتحال الشخصية والعودة لحسابك الأصلي",
	})
}

func GetAdminDashboard(c *gin.Context) {
	var totalUsers int64
	var totalSubjects int64
	var totalExams int64
	var completedTasks int64
	var totalStudySessions int64
	var newUsersToday int64
	var newUsersThisWeek int64
	var studyMinutes int64
	var examsTaken int64

	now := time.Now()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekAgo := now.AddDate(0, 0, -7)

	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where("created_at >= ?", todayStart).Count(&newUsersToday)
	db.DB.Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&newUsersThisWeek)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Exam{}).Count(&totalExams)
	db.DB.Model(&models.Task{}).Where(statusQuery, models.TaskCompleted).Count(&completedTasks)
	db.DB.Model(&models.StudySession{}).Count(&totalStudySessions)
	db.DB.Model(&models.StudySession{}).Select("COALESCE(SUM(duration_min), 0)").Scan(&studyMinutes)
	db.DB.Model(&models.ExamResult{}).Count(&examsTaken)

	var recentTasks []models.Task
	db.DB.Order("created_at desc").Limit(10).Find(&recentTasks)

	// Batch fetch users for recent tasks to avoid N+1 queries
	taskUserIDs := make([]string, 0, len(recentTasks))
	for _, t := range recentTasks {
		taskUserIDs = append(taskUserIDs, t.UserID)
	}
	var taskUsers []models.User
	if len(taskUserIDs) > 0 {
		db.DB.Where(idInQuery, taskUserIDs).Find(&taskUsers)
	}
	userMap := make(map[string]models.User, len(taskUsers))
	for _, u := range taskUsers {
		userMap[u.ID] = u
	}

	recentActivityItems := make([]gin.H, 0, len(recentTasks))
	for _, t := range recentTasks {
		user := userMap[t.UserID]
		recentActivityItems = append(recentActivityItems, gin.H{
			"id":          t.ID,
			"userId":      t.UserID,
			"type":        "task",
			"title":       t.Title,
			"description": stringOrEmpty(t.Description),
			"createdAt":   t.CreatedAt,
			"user": gin.H{
				"name":   firstNonEmpty(stringOrEmpty(user.Name), stringOrEmpty(user.Username), user.Email),
				"avatar": user.Avatar,
			},
		})
	}

	var upcomingExams []models.Exam
	db.DB.Order("created_at desc").Limit(5).Find(&upcomingExams)
	upcomingEvents := make([]gin.H, 0, len(upcomingExams))
	for _, e := range upcomingExams {
		upcomingEvents = append(upcomingEvents, gin.H{
			"id":    e.ID,
			"title": e.Title,
			"date":  e.CreatedAt,
			"type":  "exam",
		})
	}

	var totalResources int64
	db.DB.Model(&models.SubTopic{}).Where("type != ?", models.SubTopicQuiz).Count(&totalResources)

	var activeChallenges int64
	db.DB.Model(&models.Challenge{}).Where("is_active = ?", true).Count(&activeChallenges)

	var achievementsEarned int64
	db.DB.Model(&models.UserAchievement{}).Count(&achievementsEarned)

	userGrowth := make([]gin.H, 0, 6)
	for i := 5; i >= 0; i-- {
		d := now.AddDate(0, -i, 0)
		startMonth := time.Date(d.Year(), d.Month(), 1, 0, 0, 0, 0, d.Location())
		endMonth := startMonth.AddDate(0, 1, 0)

		var count int64
		db.DB.Model(&models.User{}).Where("created_at >= ? AND created_at < ?", startMonth, endMonth).Count(&count)

		userGrowth = append(userGrowth, gin.H{
			"month": int(d.Month()),
			"users": count,
		})
	}

	activityChart := make([]gin.H, 0, 7)
	for i := 6; i >= 0; i-- {
		d := now.AddDate(0, 0, -i)
		startDay := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, d.Location())
		endDay := startDay.AddDate(0, 0, 1)

		var count int64
		db.DB.Model(&models.StudySession{}).Where("start_time >= ? AND start_time < ?", startDay, endDay).Count(&count)

		activityChart = append(activityChart, gin.H{
			"day":      startDay.Format("02/01"),
			"sessions": count,
		})
	}

	api_response.Success(c, gin.H{
		"stats": gin.H{
			"totalUsers":       totalUsers,
			"totalSubjects":    totalSubjects,
			"totalExams":       totalExams,
			"totalResources":   totalResources,
			"activeChallenges": activeChallenges,
			"newUsersToday":    newUsersToday,
			"newUsersThisWeek": newUsersThisWeek,
		},
		"trends": gin.H{
			"userGrowth": calculateUserGrowthTrend(),
			"studyTime":  calculateStudyTimeTrend(),
		},
		"charts": gin.H{
			"userGrowth": userGrowth,
			"activity":   activityChart,
		},
		"activity": gin.H{
			"tasksCompleted":     completedTasks,
			"examsTaken":         examsTaken,
			"achievementsEarned": achievementsEarned,
			"studyMinutes":       studyMinutes,
		},
		"recentActivity": recentActivityItems,
		"upcomingEvents": upcomingEvents,
	})
}

func GetAdminLive(c *gin.Context) {
	minutes, _ := strconv.Atoi(c.DefaultQuery("minutes", "5"))
	if minutes <= 0 {
		minutes = 5
	}
	cutoff := time.Now().Add(-time.Duration(minutes) * time.Minute)

	var users []models.User
	if err := db.DB.Where(statusQuery, models.StatusActive).Order("\"updatedAt\" desc").Limit(200).Find(&users).Error; err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch active users")
		return
	}

	var studySessions []models.StudySession
	_ = db.DB.Where("\"updatedAt\" >= ? OR \"startTime\" >= ? OR \"endTime\" >= ?", cutoff, cutoff, cutoff).Find(&studySessions).Error

	var examResults []models.ExamResult
	_ = db.DB.Where("\"takenAt\" >= ?", cutoff).Find(&examResults).Error

	// Batch-preload exams and subjects to avoid N+1 queries
	examIDs := make([]string, 0, len(examResults))
	for _, r := range examResults {
		examIDs = append(examIDs, r.ExamID)
	}
	examMap := make(map[string]models.Exam)
	subjectMap := make(map[string]models.Subject)
	if len(examIDs) > 0 {
		var exams []models.Exam
		db.DB.Where(idInQuery, examIDs).Find(&exams)
		subjectIDs := make([]string, 0, len(exams))
		for _, e := range exams {
			examMap[e.ID] = e
			subjectIDs = append(subjectIDs, e.SubjectID)
		}
		if len(subjectIDs) > 0 {
			var subjects []models.Subject
			db.DB.Where(idInQuery, subjectIDs).Find(&subjects)
			for _, s := range subjects {
				subjectMap[s.ID] = s
			}
		}
	}

	// Batch-preload subjects for study sessions
	sessionSubjectIDs := make([]string, 0, len(studySessions))
	for _, s := range studySessions {
		if s.SubjectID != nil && *s.SubjectID != "" {
			sessionSubjectIDs = append(sessionSubjectIDs, *s.SubjectID)
		}
	}
	if len(sessionSubjectIDs) > 0 {
		var subjects []models.Subject
		db.DB.Where(idInQuery, sessionSubjectIDs).Find(&subjects)
		for _, s := range subjects {
			subjectMap[s.ID] = s
		}
	}

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

			exam, examFound := examMap[result.ExamID]
			if examFound {
				subject := subjectMap[exam.SubjectID]

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
				if session.SubjectID != nil && *session.SubjectID != "" {
					subject = subjectMap[*session.SubjectID]
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

	api_response.List(c, items, api_response.Pagination{
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

	broadcastMsg, _ := json.Marshal(gin.H{
		"type": "notification",
		"payload": gin.H{
			"title":   notification.Title,
			"message": notification.Message,
			"type":    notification.Type,
		},
	})
	GlobalHub.broadcast <- broadcastMsg

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

	type announcementUpdates struct {
		Title   *string `gorm:"column:title"`
		Message *string `gorm:"column:message"`
		Type    *string `gorm:"column:type"`
	}

	updates := announcementUpdates{}
	if input.Title != "" { updates.Title = &input.Title }
	if input.Content != "" { updates.Message = &input.Content }
	if input.Type != "" { updates.Type = &input.Type }

	if err := db.DB.Model(&models.Notification{}).Where("id = ?", input.ID).
		Updates(&updates).Error; err != nil {
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
	var totalBlogPosts int64
	var achievementsEarned int64
	var challengesCompleted int64

	db.DB.Model(&models.User{}).Count(&totalUsers)
	db.DB.Model(&models.User{}).Where(statusQuery, models.StatusActive).Count(&activeUsers)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Exam{}).Count(&totalExams)
	db.DB.Model(&models.Notification{}).Count(&totalNotifications)
	db.DB.Model(&models.User{}).Select("COALESCE(SUM(\"totalXP\"), 0)").Scan(&totalXP)
	db.DB.Model(&models.BlogPost{}).Count(&totalBlogPosts)
	db.DB.Model(&models.Achievement{}).Select("COALESCE(SUM(\"unlockedCount\"), 0)").Scan(&achievementsEarned)
	db.DB.Model(&models.Challenge{}).Where("\"isActive\" = ?", false).Count(&challengesCompleted)

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
		db.DB.Model(&models.User{}).Where("\"createdAt\" >= ? AND \"createdAt\" < ?", start, end).Count(&createdCount)
		db.DB.Model(&models.StudySession{}).Where("\"createdAt\" >= ? AND \"createdAt\" < ?", start, end).Distinct("\"userId\"").Count(&activeCount)

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
			"blogPosts": totalBlogPosts,
		},
		"gamification": gin.H{
			"totalXP":             totalXP,
			"achievementsEarned":  achievementsEarned,
			"challengesCompleted": challengesCompleted,
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
	db.DB.Model(&models.User{}).Where("\"createdAt\" >= ?", dayAgo).Count(&usersToday)
	db.DB.Model(&models.User{}).Where("created_at >= ?", weekAgo).Count(&usersWeek)
	db.DB.Model(&models.User{}).Where("\"createdAt\" >= ?", monthAgo).Count(&usersMonth)
	db.DB.Model(&models.Subject{}).Count(&totalSubjects)
	db.DB.Model(&models.Subject{}).Where("is_active = ?", true).Count(&activeSubjects)
	db.DB.Model(&models.Notification{}).Count(&totalNotifications)
	db.DB.Model(&models.StudySession{}).Count(&totalStudySessions)

	var subjects []models.Subject
	db.DB.Order("\"enrolledCount\" desc").Limit(5).Find(&subjects)
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
		db.DB.Model(&models.User{}).Where("\"createdAt\" >= ? AND \"createdAt\" < ?", start, end).Count(&count)
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

	api_response.Success(c, gin.H{
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

func GetAdminInfrastructureStats(c *gin.Context) {
	numGoroutines := runtime.NumGoroutine()

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	memoryMiB := m.Alloc / 1024 / 1024

	dbStatus := "healthy"
	sqlDB, err := db.DB.DB()
	if err != nil {
		dbStatus = "unhealthy"
	} else {
		if pingErr := sqlDB.Ping(); pingErr != nil {
			dbStatus = "unhealthy"
		}
	}

	redisLatency := "N/A"

	queues := gin.H{
		"active":  0,
		"waiting": 0,
		"failed":  0,
	}

	c.JSON(http.StatusOK, gin.H{
		"goroutines":   numGoroutines,
		"memoryMiB":    memoryMiB,
		"dbStatus":     dbStatus,
		"redisLatency": redisLatency,
		"queues":       queues,
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

	api_response.Success(c, gin.H{
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

func calculateUserGrowthTrend() float64 {
	now := time.Now()
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	lastMonthStart := thisMonthStart.AddDate(0, -1, 0)

	var thisMonth int64
	var lastMonth int64

	db.DB.Model(&models.User{}).Where("created_at >= ?", thisMonthStart).Count(&thisMonth)
	db.DB.Model(&models.User{}).Where("created_at >= ? AND created_at < ?", lastMonthStart, thisMonthStart).Count(&lastMonth)

	if lastMonth == 0 {
		if thisMonth > 0 {
			return 100.0
		}
		return 0.0
	}

	return float64(thisMonth-lastMonth) / float64(lastMonth) * 100.0
}

func calculateStudyTimeTrend() float64 {
	now := time.Now()
	thisWeekStart := now.AddDate(0, 0, -int(now.Weekday()))
	lastWeekStart := thisWeekStart.AddDate(0, 0, -7)

	var thisWeek int64
	var lastWeek int64

	db.DB.Model(&models.StudySession{}).Where("start_time >= ?", thisWeekStart).Select("COALESCE(SUM(duration_min), 0)").Scan(&thisWeek)
	db.DB.Model(&models.StudySession{}).Where("start_time >= ? AND start_time < ?", lastWeekStart, thisWeekStart).Select("COALESCE(SUM(duration_min), 0)").Scan(&lastWeek)

	if lastWeek == 0 {
		if thisWeek > 0 {
			return 100.0
		}
		return 0.0
	}

	return float64(thisWeek-lastWeek) / float64(lastWeek) * 100.0
}
