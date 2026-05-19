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
	if err := db.DB.Where(userIDQuery, userId).Order("created_at desc").Limit(100).Find(&tasks).Error; err != nil {
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

	if err := SafeCreate(db.DB, &task); err != nil {
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
	if err := db.DB.Where("id = ? AND user_id = ?", id, uid).First(&existingTask).Error; err != nil {
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

		return handleTaskGamification(tx, uid, originalStatus, task.Status)
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

	if err := db.DB.Where("id = ? AND user_id = ?", id, uid).Delete(&models.Task{}).Error; err != nil {
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
	if err := db.DB.Where(userIDQuery, userId).Order("created_at desc").Limit(100).Find(&sessions).Error; err != nil {
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

	if err := SafeCreate(db.DB, &session); err != nil {
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
	if err := db.DB.Where(userIDQuery, userId).Order("updated_at desc").First(&schedule).Error; err != nil {
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
	err := db.DB.Where(userIDQuery, uid).First(&schedule).Error
	if err != nil {
		// Create new
		schedule = models.Schedule{
			UserID:   uid,
			PlanJson: input.PlanJson,
		}
		SafeCreate(db.DB, &schedule)
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
	if err := db.DB.Where(userIDQuery, userId).Order("remind_at asc").Limit(100).Find(&reminders).Error; err != nil {
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

	if err := SafeCreate(db.DB, &reminder); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create reminder"})
		return
	}
	c.JSON(http.StatusCreated, reminder)
}

func handleTaskGamification(tx *gorm.DB, uid string, oldStatus, newStatus models.TaskStatus) error {
	if oldStatus != models.TaskCompleted && newStatus == models.TaskCompleted {
		return tx.Model(&models.User{}).Where("id = ?", uid).
			Updates(map[string]interface{}{
				"total_xp":        gorm.Expr("total_xp + ?", 50),
				"tasks_completed": gorm.Expr("tasks_completed + ?", 1),
			}).Error
	}

	if oldStatus == models.TaskCompleted && newStatus != models.TaskCompleted {
		return tx.Model(&models.User{}).Where("id = ?", uid).
			Updates(map[string]interface{}{
				"total_xp":        gorm.Expr("total_xp - ?", 50),
				"tasks_completed": gorm.Expr("tasks_completed - ?", 1),
			}).Error
	}

	return nil
}
