package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	apiresponse "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

func GetTeachers(c *gin.Context) {
	var teachers []models.User
	if err := db.DB.Where("role = ?", models.RoleTeacher).Find(&teachers).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to fetch teachers")
		return
	}

	apiresponse.Success(c, teachers)
}

func GetTeachersForAdmin(c *gin.Context) {
	var teachers []models.User
	if err := db.DB.Where("role = ?", models.RoleTeacher).Find(&teachers).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to fetch teachers")
		return
	}

	items := make([]gin.H, 0, len(teachers))
	for _, teacher := range teachers {
		items = append(items, gin.H{
			"id":        teacher.ID,
			"name":      firstNonEmpty(stringOrEmpty(teacher.Name), stringOrEmpty(teacher.Username), teacher.Email),
			"subjectId": "",
			"onlineUrl": nil,
			"rating":    0,
			"notes":     teacher.Bio,
			"createdAt": teacher.CreatedAt,
			"subject": gin.H{
				"name":   "",
				"nameAr": nil,
				"color":  nil,
			},
		})
	}

	apiresponse.Success(c, gin.H{
		"items":    items,
		"teachers": items,
	})
}

func CreateTeacher(c *gin.Context) {
	var input struct {
		Name      string  `json:"name" binding:"required"`
		SubjectID string  `json:"subjectId"`
		OnlineURL *string `json:"onlineUrl"`
		Notes     *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	teacherName := input.Name
	email := strings.ToLower(strings.ReplaceAll(strings.TrimSpace(input.Name), " ", ".")) + "@thanawy.local"

	var existingUser models.User
	if err := db.DB.Where("email = ?", email).First(&existingUser).Error; err == nil {
		apiresponse.Error(c, http.StatusConflict, "Teacher with this name already exists")
		return
	}

	randomBytes := make([]byte, 16)
	_, _ = rand.Read(randomBytes)
	randomPassword := hex.EncodeToString(randomBytes)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(randomPassword), 12)
	if err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to generate password")
		return
	}

	teacher := models.User{
		Email:        email,
		Name:         &teacherName,
		Username:     &teacherName,
		PasswordHash: string(hashedPassword),
		Role:         models.RoleTeacher,
		Bio:          input.Notes,
	}

	if err := SafeCreate(db.DB, &teacher); err != nil {
		if IsDuplicateKeyError(err) {
			apiresponse.Error(c, http.StatusConflict, "Teacher with this email already exists")
			return
		}
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to create teacher")
		return
	}

	apiresponse.Created(c, gin.H{"teacher": teacher})
}

func UpdateTeacher(c *gin.Context) {
	var input struct {
		ID        string  `json:"id" binding:"required"`
		Name      string  `json:"name"`
		OnlineURL *string `json:"onlineUrl"`
		Notes     *string `json:"notes"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	var teacher models.User
	if err := db.DB.Where("id = ? AND role = ?", input.ID, models.RoleTeacher).First(&teacher).Error; err != nil {
		apiresponse.Error(c, http.StatusNotFound, "Teacher not found")
		return
	}

	updates := map[string]interface{}{}
	if input.Name != "" {
		updates["name"] = input.Name
		updates["username"] = input.Name
	}
	if input.Notes != nil {
		updates["bio"] = *input.Notes
	}

	if len(updates) > 0 {
		if err := db.DB.Model(&models.User{}).Where(queryID, teacher.ID).Updates(updates).Error; err != nil {
			apiresponse.Error(c, http.StatusInternalServerError, "Failed to update teacher")
			return
		}
	}

	apiresponse.Success(c, nil)
}

func DeleteTeacher(c *gin.Context) {
	var input struct {
		ID string `json:"id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		apiresponse.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := db.DB.Delete(&models.User{}, "id = ? AND role = ?", input.ID, models.RoleTeacher).Error; err != nil {
		apiresponse.Error(c, http.StatusInternalServerError, "Failed to delete teacher")
		return
	}

	apiresponse.Success(c, nil)
}
