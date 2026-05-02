package handlers

import (
	"net/http"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Tasks
func GetTasks(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var tasks []models.Task
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(100).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

func CreateTask(c *gin.Context) {
	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	task.UserID = userIdValue.(string)

	if err := db.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}
	c.JSON(http.StatusCreated, task)
}

func UpdateTask(c *gin.Context) {
	id := c.Param("id")
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	uid := userIdValue.(string)

	var existingTask models.Task
	if err := db.DB.Where("id = ? AND \"userId\" = ?", id, uid).First(&existingTask).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	originalStatus := existingTask.Status

	var task models.Task
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ensure ID and UserID don't change
	task.ID = id
	task.UserID = uid

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&task).Error; err != nil {
			return err
		}

		// Gamification logic
		if originalStatus != models.TaskCompleted && task.Status == models.TaskCompleted {
			if err := tx.Model(&models.User{}).Where("id = ?", uid).
				Updates(map[string]interface{}{
					"TotalXP":        gorm.Expr("\"totalXP\" + ?", 50),
					"TasksCompleted": gorm.Expr("\"tasksCompleted\" + ?", 1),
				}).Error; err != nil {
				return err
			}
		} else if originalStatus == models.TaskCompleted && task.Status != models.TaskCompleted {
			if err := tx.Model(&models.User{}).Where("id = ?", uid).
				Updates(map[string]interface{}{
					"TotalXP":        gorm.Expr("\"totalXP\" - ?", 50),
					"TasksCompleted": gorm.Expr("\"tasksCompleted\" - ?", 1),
				}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}
	c.JSON(http.StatusOK, task)
}

func DeleteTask(c *gin.Context) {
	id := c.Param("id")
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	uid := userIdValue.(string)

	if err := db.DB.Where("id = ? AND \"userId\" = ?", id, uid).Delete(&models.Task{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete task"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Study Sessions
func GetStudySessions(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var sessions []models.StudySession
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"createdAt\" desc").Limit(100).Find(&sessions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch study sessions"})
		return
	}
	c.JSON(http.StatusOK, sessions)
}

func CreateStudySession(c *gin.Context) {
	var session models.StudySession
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userId, _ := c.Get("userId")
	if userId != nil {
		session.UserID = userId.(string)
	}

	if err := db.DB.Create(&session).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create study session"})
		return
	}
	c.JSON(http.StatusCreated, session)
}

// Schedule
func GetSchedule(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var schedule models.Schedule
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"updatedAt\" desc").First(&schedule).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"planJson": "{\"timeBlocks\": []}"})
		return
	}
	c.JSON(http.StatusOK, schedule)
}

func UpdateSchedule(c *gin.Context) {
	var input struct {
		PlanJson string `json:"planJson" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userId, _ := c.Get("userId")
	uid := userId.(string)

	var schedule models.Schedule
	err := db.DB.Where("\"userId\" = ?", uid).First(&schedule).Error
	if err != nil {
		// Create new
		schedule = models.Schedule{
			UserID:   uid,
			PlanJson: input.PlanJson,
		}
		db.DB.Create(&schedule)
	} else {
		// Update existing
		db.DB.Model(&schedule).Update("planJson", input.PlanJson)
	}

	c.JSON(http.StatusOK, schedule)
}

// Reminders
func GetReminders(c *gin.Context) {
	userIdValue, exists := c.Get("userId")
	if !exists || userIdValue == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userId := userIdValue.(string)

	var reminders []models.Reminder
	if err := db.DB.Where("\"userId\" = ?", userId).Order("\"time\" asc").Limit(100).Find(&reminders).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reminders"})
		return
	}
	c.JSON(http.StatusOK, reminders)
}

func CreateReminder(c *gin.Context) {
	var reminder models.Reminder
	if err := c.ShouldBindJSON(&reminder); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userId, _ := c.Get("userId")
	if userId != nil {
		reminder.UserID = userId.(string)
	}

	if err := db.DB.Create(&reminder).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reminder"})
		return
	}
	c.JSON(http.StatusCreated, reminder)
}
