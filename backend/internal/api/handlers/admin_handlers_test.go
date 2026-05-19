package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	require.NoError(t, err)

	err = db.AutoMigrate(
		&models.Category{},
		&models.User{},
		&models.Achievement{},
		&models.Reward{},
		&models.Season{},
		&models.Coupon{},
		&models.Challenge{},
		&models.BlogPost{},
		&models.ForumTopic{},
		&models.ForumCategory{},
		&models.ABExperiment{},
		&models.Book{},
		&models.Campaign{},
		&models.Automation{},
	)
	require.NoError(t, err)

	return db
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestCreateCategory_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/categories", CreateCategory)

	body := map[string]interface{}{
		"name":        "Mathematics",
		"description": "Math courses",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestCreateCategory_Duplicate(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Category{
		Name: "Mathematics",
		Slug: "mathematics",
		Type: models.CategoryTypeCourse,
	})

	router := setupTestRouter()
	router.POST("/categories", CreateCategory)

	body := map[string]interface{}{
		"name": "Mathematics",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestCreateCategory_MissingName(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/categories", CreateCategory)

	body := map[string]interface{}{
		"description": "No name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateCategory_WithType(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/categories", CreateCategory)

	body := map[string]interface{}{
		"name": "Library Books",
		"type": "LIBRARY",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestGetCategories_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Category{
		Name: "Math",
		Slug: "math",
		Type: models.CategoryTypeCourse,
	})
	testDB.Create(&models.Category{
		Name: "Science",
		Slug: "science",
		Type: models.CategoryTypeCourse,
	})

	router := setupTestRouter()
	router.GET("/categories", GetCategories)

	req := httptest.NewRequest(http.MethodGet, "/categories", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetCategories_FilterByType(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Category{
		Name: "Course Cat",
		Slug: "course-cat",
		Type: models.CategoryTypeCourse,
	})
	testDB.Create(&models.Category{
		Name: "Library Cat",
		Slug: "library-cat",
		Type: models.CategoryTypeLibrary,
	})

	router := setupTestRouter()
	router.GET("/categories", GetCategories)

	req := httptest.NewRequest(http.MethodGet, "/categories?type=COURSE", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateCategory_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	category := models.Category{
		Name: "Old Name",
		Slug: "old-name",
		Type: models.CategoryTypeCourse,
	}
	testDB.Create(&category)

	router := setupTestRouter()
	router.PATCH("/categories", UpdateCategory)

	body := map[string]interface{}{
		"id":   category.ID,
		"name": "New Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateCategory_NotFound(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.PATCH("/categories", UpdateCategory)

	body := map[string]interface{}{
		"id":   "non-existent-id",
		"name": "New Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteCategory_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	category := models.Category{
		Name: "To Delete",
		Slug: "to-delete",
		Type: models.CategoryTypeCourse,
	}
	testDB.Create(&category)

	router := setupTestRouter()
	router.DELETE("/categories", DeleteCategory)

	body := map[string]interface{}{
		"id": category.ID,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodDelete, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeleteCategory_WithSubjects(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	category := models.Category{
		Name: "With Subjects",
		Slug: "with-subjects",
		Type: models.CategoryTypeCourse,
	}
	testDB.Create(&category)

	router := setupTestRouter()
	router.DELETE("/categories", DeleteCategory)

	body := map[string]interface{}{
		"id": category.ID,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodDelete, "/categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCreateTeacher_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/teachers", CreateTeacher)

	body := map[string]interface{}{
		"name": "John Doe",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestCreateTeacher_Duplicate(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.User{
		Email:        "john.doe@thanawy.local",
		Name:         ptr("John Doe"),
		Username:     ptr("John Doe"),
		Role:         models.RoleTeacher,
		PasswordHash: "hashed",
	})

	router := setupTestRouter()
	router.POST("/teachers", CreateTeacher)

	body := map[string]interface{}{
		"name": "John Doe",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestCreateTeacher_MissingName(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/teachers", CreateTeacher)

	body := map[string]interface{}{}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestGetTeachers_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.User{
		Email:        "teacher1@thanawy.local",
		Name:         ptr("Teacher One"),
		Role:         models.RoleTeacher,
		PasswordHash: "hashed",
	})

	router := setupTestRouter()
	router.GET("/teachers", GetTeachers)

	req := httptest.NewRequest(http.MethodGet, "/teachers", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateTeacher_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	teacher := models.User{
		Email:        "teacher@thanawy.local",
		Name:         ptr("Old Name"),
		Role:         models.RoleTeacher,
		PasswordHash: "hashed",
	}
	testDB.Create(&teacher)

	router := setupTestRouter()
	router.PATCH("/teachers", UpdateTeacher)

	body := map[string]interface{}{
		"id":   teacher.ID,
		"name": "New Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestUpdateTeacher_NotFound(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.PATCH("/teachers", UpdateTeacher)

	body := map[string]interface{}{
		"id":   "non-existent",
		"name": "New Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestDeleteTeacher_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	teacher := models.User{
		Email:        "todelete@thanawy.local",
		Name:         ptr("To Delete"),
		Role:         models.RoleTeacher,
		PasswordHash: "hashed",
	}
	testDB.Create(&teacher)

	router := setupTestRouter()
	router.DELETE("/teachers", DeleteTeacher)

	body := map[string]interface{}{
		"id": teacher.ID,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodDelete, "/teachers", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateAchievement_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/achievements", AdminCreateAchievement)

	body := map[string]interface{}{
		"name":        "First Achievement",
		"description": "Complete first task",
		"points":      100,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/achievements", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminGetAchievements_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Achievement{
		Name:        "Achievement 1",
		Description: "Desc 1",
		Points:      100,
	})

	router := setupTestRouter()
	router.GET("/achievements", AdminGetAchievements)

	req := httptest.NewRequest(http.MethodGet, "/achievements", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateAchievement_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	achievement := models.Achievement{
		Name:        "Old Name",
		Description: "Old Desc",
		Points:      100,
	}
	testDB.Create(&achievement)

	router := setupTestRouter()
	router.PATCH("/achievements/:id", AdminUpdateAchievement)

	body := map[string]interface{}{
		"name": "New Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/achievements/"+achievement.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteAchievement_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	achievement := models.Achievement{
		Name:   "To Delete",
		Points: 100,
	}
	testDB.Create(&achievement)

	router := setupTestRouter()
	router.DELETE("/achievements/:id", AdminDeleteAchievement)

	req := httptest.NewRequest(http.MethodDelete, "/achievements/"+achievement.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateReward_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/rewards", AdminCreateReward)

	body := map[string]interface{}{
		"name":        "Free Month",
		"description": "Get a free month",
		"cost":        500,
		"type":        "subscription",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/rewards", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateSeason_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/seasons", AdminCreateSeason)

	body := map[string]interface{}{
		"name":     "Summer 2024",
		"isActive": true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/seasons", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateCoupon_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/coupons", AdminCreateCoupon)

	body := map[string]interface{}{
		"code":          "SAVE10",
		"discountType":  "percentage",
		"discountValue": 10.0,
		"isActive":      true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/coupons", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateCoupon_Duplicate(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Coupon{
		Code:          "SAVE10",
		DiscountType:  "percentage",
		DiscountValue: 10.0,
		IsActive:      true,
	})

	router := setupTestRouter()
	router.POST("/coupons", AdminCreateCoupon)

	body := map[string]interface{}{
		"code":          "SAVE10",
		"discountType":  "percentage",
		"discountValue": 10.0,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/coupons", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusConflict, w.Code)
}

func TestAdminCreateChallenge_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/challenges", AdminCreateChallenge)

	body := map[string]interface{}{
		"title":       "Math Challenge",
		"description": "Solve 10 math problems",
		"points":      50,
		"isActive":    true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/challenges", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateBlogPost_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/blog", AdminCreateBlogPost)

	body := map[string]interface{}{
		"title":   "New Blog Post",
		"content": "Content here",
		"slug":    "new-blog-post",
		"status":  "DRAFT",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/blog", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateCampaign_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/marketing/campaigns", AdminCreateCampaign)

	body := map[string]interface{}{
		"name":        "Summer Sale",
		"description": "50% off",
		"status":      "active",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/marketing/campaigns", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateCampaign_MissingName(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/marketing/campaigns", AdminCreateCampaign)

	body := map[string]interface{}{
		"description": "No name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/marketing/campaigns", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAdminCreateAutomation_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/automations", AdminCreateAutomation)

	body := map[string]interface{}{
		"name":      "Auto Email",
		"type":      "email",
		"trigger":   "user_signup",
		"action":    "send_welcome_email",
		"isActive":  true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/automations", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateABTest_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/ab-testing", AdminCreateABTest)

	body := map[string]interface{}{
		"name":         "Homepage Test",
		"description":  "Test two homepage variants",
		"status":       "draft",
		"trafficSplit": 50.0,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/ab-testing", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminGetAuditLogs_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.GET("/audit-logs", AdminGetAuditLogs)

	req := httptest.NewRequest(http.MethodGet, "/audit-logs", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetPublicBlogPosts_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.BlogPost{
		Title:   "Public Post",
		Content: "Content",
		Slug:    "public-post",
		Status:  "PUBLISHED",
	})

	router := setupTestRouter()
	router.GET("/blog/posts", GetPublicBlogPosts)

	req := httptest.NewRequest(http.MethodGet, "/blog/posts", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetPublicBlogPost_NotFound(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.GET("/blog/posts/:slug", GetPublicBlogPost)

	req := httptest.NewRequest(http.MethodGet, "/blog/posts/non-existent", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestGetPublicEvents_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.GET("/events", GetPublicEvents)

	req := httptest.NewRequest(http.MethodGet, "/events", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateBook_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/books", AdminCreateBook)

	body := map[string]interface{}{
		"title":  "Math Book",
		"author": "Author Name",
		"price":  29.99,
		"isFree": false,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminCreateBook_MissingTitle(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/books", AdminCreateBook)

	body := map[string]interface{}{
		"author": "Author Name",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/books", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAdminGetBooks_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Book{
		Title:  "Test Book",
		Author: "Author",
		Price:  19.99,
	})

	router := setupTestRouter()
	router.GET("/books", AdminGetBooks)

	req := httptest.NewRequest(http.MethodGet, "/books", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateBook_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	book := models.Book{
		Title:  "Old Title",
		Author: "Author",
		Price:  19.99,
	}
	testDB.Create(&book)

	router := setupTestRouter()
	router.PATCH("/books/:id", AdminUpdateBook)

	body := map[string]interface{}{
		"title": "New Title",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/books/"+book.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteBook_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	book := models.Book{
		Title:  "To Delete",
		Author: "Author",
		Price:  19.99,
	}
	testDB.Create(&book)

	router := setupTestRouter()
	router.DELETE("/books/:id", AdminDeleteBook)

	req := httptest.NewRequest(http.MethodDelete, "/books/"+book.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetForum_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.GET("/forum", AdminGetForum)

	req := httptest.NewRequest(http.MethodGet, "/forum", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetForumCategories_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.GET("/forum-categories", AdminGetForumCategories)

	req := httptest.NewRequest(http.MethodGet, "/forum-categories", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminCreateForumCategory_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	router := setupTestRouter()
	router.POST("/forum-categories", AdminCreateForumCategory)

	body := map[string]interface{}{
		"name":        "General Discussion",
		"description": "General topics",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/forum-categories", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestAdminGetCoupons_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Coupon{
		Code:          "TEST10",
		DiscountType:  "percentage",
		DiscountValue: 10.0,
		IsActive:      true,
	})

	router := setupTestRouter()
	router.GET("/coupons", AdminGetCoupons)

	req := httptest.NewRequest(http.MethodGet, "/coupons", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetRewards_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Reward{
		Name:        "Free Month",
		Description: "Get a free month",
		Cost:        500,
		Type:        "subscription",
	})

	router := setupTestRouter()
	router.GET("/rewards", AdminGetRewards)

	req := httptest.NewRequest(http.MethodGet, "/rewards", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetSeasons_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Season{
		Name:     "Summer 2024",
		IsActive: true,
	})

	router := setupTestRouter()
	router.GET("/seasons", AdminGetSeasons)

	req := httptest.NewRequest(http.MethodGet, "/seasons", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetChallenges_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Challenge{
		Title:    "Math Challenge",
		Points:   50,
		IsActive: true,
	})

	router := setupTestRouter()
	router.GET("/challenges", AdminGetChallenges)

	req := httptest.NewRequest(http.MethodGet, "/challenges", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetBlog_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.BlogPost{
		Title:  "Test Post",
		Slug:   "test-post",
		Status: "DRAFT",
	})

	router := setupTestRouter()
	router.GET("/blog", AdminGetBlog)

	req := httptest.NewRequest(http.MethodGet, "/blog", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetABTests_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.ABExperiment{
		Name:         "Test A/B",
		Status:       "draft",
		TrafficSplit: 50.0,
	})

	router := setupTestRouter()
	router.GET("/ab-testing", AdminGetABTests)

	req := httptest.NewRequest(http.MethodGet, "/ab-testing", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetCampaigns_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Campaign{
		Name:   "Summer Sale",
		Status: "active",
	})

	router := setupTestRouter()
	router.GET("/marketing/campaigns", AdminGetCampaigns)

	req := httptest.NewRequest(http.MethodGet, "/marketing/campaigns", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminGetAutomations_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	testDB.Create(&models.Automation{
		Name:     "Auto Email",
		Type:     "email",
		IsActive: true,
	})

	router := setupTestRouter()
	router.GET("/automations", AdminGetAutomations)

	req := httptest.NewRequest(http.MethodGet, "/automations", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateReward_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	reward := models.Reward{
		Name:        "Old Reward",
		Description: "Old Desc",
		Cost:        100,
		Type:        "discount",
	}
	testDB.Create(&reward)

	router := setupTestRouter()
	router.PATCH("/rewards/:id", AdminUpdateReward)

	body := map[string]interface{}{
		"name": "New Reward",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/rewards/"+reward.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateSeason_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	season := models.Season{
		Name:     "Old Season",
		IsActive: false,
	}
	testDB.Create(&season)

	router := setupTestRouter()
	router.PATCH("/seasons/:id", AdminUpdateSeason)

	body := map[string]interface{}{
		"name":     "New Season",
		"isActive": true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/seasons/"+season.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateCoupon_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	coupon := models.Coupon{
		Code:          "OLD10",
		DiscountType:  "percentage",
		DiscountValue: 10.0,
		IsActive:      true,
	}
	testDB.Create(&coupon)

	router := setupTestRouter()
	router.PATCH("/coupons/:id", AdminUpdateCoupon)

	body := map[string]interface{}{
		"code": "NEW20",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/coupons/"+coupon.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateChallenge_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	challenge := models.Challenge{
		Title:    "Old Challenge",
		Points:   50,
		IsActive: true,
	}
	testDB.Create(&challenge)

	router := setupTestRouter()
	router.PATCH("/challenges/:id", AdminUpdateChallenge)

	body := map[string]interface{}{
		"title": "New Challenge",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/challenges/"+challenge.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateBlogPost_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	post := models.BlogPost{
		Title:  "Old Title",
		Slug:   "old-title",
		Status: "DRAFT",
	}
	testDB.Create(&post)

	router := setupTestRouter()
	router.PATCH("/blog/:id", AdminUpdateBlogPost)

	body := map[string]interface{}{
		"title": "New Title",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/blog/"+post.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateABTest_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	experiment := models.ABExperiment{
		Name:         "Old Test",
		Status:       "draft",
		TrafficSplit: 50.0,
	}
	testDB.Create(&experiment)

	router := setupTestRouter()
	router.PATCH("/ab-testing/:id", AdminUpdateABTest)

	body := map[string]interface{}{
		"name": "New Test",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/ab-testing/"+experiment.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateCampaign_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	campaign := models.Campaign{
		Name:   "Old Campaign",
		Status: "draft",
	}
	testDB.Create(&campaign)

	router := setupTestRouter()
	router.PATCH("/marketing/campaigns/:id", AdminUpdateCampaign)

	body := map[string]interface{}{
		"name":   "New Campaign",
		"status": "active",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/marketing/campaigns/"+campaign.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminUpdateAutomation_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	automation := models.Automation{
		Name:     "Old Automation",
		Type:     "email",
		IsActive: false,
	}
	testDB.Create(&automation)

	router := setupTestRouter()
	router.PATCH("/automations/:id", AdminUpdateAutomation)

	body := map[string]interface{}{
		"name":     "New Automation",
		"isActive": true,
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/automations/"+automation.ID, bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteReward_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	reward := models.Reward{
		Name: "To Delete",
		Cost: 100,
		Type: "discount",
	}
	testDB.Create(&reward)

	router := setupTestRouter()
	router.DELETE("/rewards/:id", AdminDeleteReward)

	req := httptest.NewRequest(http.MethodDelete, "/rewards/"+reward.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteSeason_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	season := models.Season{
		Name:     "To Delete",
		IsActive: false,
	}
	testDB.Create(&season)

	router := setupTestRouter()
	router.DELETE("/seasons/:id", AdminDeleteSeason)

	req := httptest.NewRequest(http.MethodDelete, "/seasons/"+season.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteCoupon_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	coupon := models.Coupon{
		Code:          "DEL10",
		DiscountType:  "percentage",
		DiscountValue: 10.0,
		IsActive:      true,
	}
	testDB.Create(&coupon)

	router := setupTestRouter()
	router.DELETE("/coupons/:id", AdminDeleteCoupon)

	req := httptest.NewRequest(http.MethodDelete, "/coupons/"+coupon.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteChallenge_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	challenge := models.Challenge{
		Title:    "To Delete",
		Points:   50,
		IsActive: true,
	}
	testDB.Create(&challenge)

	router := setupTestRouter()
	router.DELETE("/challenges/:id", AdminDeleteChallenge)

	req := httptest.NewRequest(http.MethodDelete, "/challenges/"+challenge.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteBlogPost_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	post := models.BlogPost{
		Title:  "To Delete",
		Slug:   "to-delete",
		Status: "DRAFT",
	}
	testDB.Create(&post)

	router := setupTestRouter()
	router.DELETE("/blog/:id", AdminDeleteBlogPost)

	req := httptest.NewRequest(http.MethodDelete, "/blog/"+post.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteABTest_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	experiment := models.ABExperiment{
		Name:         "To Delete",
		Status:       "draft",
		TrafficSplit: 50.0,
	}
	testDB.Create(&experiment)

	router := setupTestRouter()
	router.DELETE("/ab-testing/:id", AdminDeleteABTest)

	req := httptest.NewRequest(http.MethodDelete, "/ab-testing/"+experiment.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteCampaign_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	campaign := models.Campaign{
		Name:   "To Delete",
		Status: "draft",
	}
	testDB.Create(&campaign)

	router := setupTestRouter()
	router.DELETE("/marketing/campaigns/:id", AdminDeleteCampaign)

	req := httptest.NewRequest(http.MethodDelete, "/marketing/campaigns/"+campaign.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestAdminDeleteAutomation_Success(t *testing.T) {
	testDB := setupTestDB(t)
	db.DB = testDB

	automation := models.Automation{
		Name:     "To Delete",
		Type:     "email",
		IsActive: false,
	}
	testDB.Create(&automation)

	router := setupTestRouter()
	router.DELETE("/automations/:id", AdminDeleteAutomation)

	req := httptest.NewRequest(http.MethodDelete, "/automations/"+automation.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}
