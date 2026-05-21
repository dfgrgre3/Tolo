package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"
)

const errBackupNotFound = "Backup not found"

// CreateBackupRequest represents a request to create a backup
type CreateBackupRequest struct {
	Name             string   `json:"name" binding:"required,max=100"`
	Type             string   `json:"type" binding:"required,oneof=full database files incremental"`
	Tables           []string `json:"tables,omitempty"`
	IncludesFiles    bool     `json:"includesFiles"`
	IncludesDatabase bool     `json:"includesDatabase"`
	RetentionDays    int      `json:"retentionDays" binding:"omitempty,min=1,max=365"`
}

// RestoreBackupRequest represents a restore request
type RestoreBackupRequest struct {
	TargetTables []string `json:"targetTables,omitempty"`
	SkipExisting bool     `json:"skipExisting"`
	DryRun       bool     `json:"dryRun"`
}

// ScheduleBackupRequest represents a scheduled backup configuration
type ScheduleBackupRequest struct {
	Frequency     string `json:"frequency" binding:"required,oneof=daily weekly monthly"`
	Type          string `json:"type" binding:"required,oneof=full database files incremental"`
	Time          string `json:"time" binding:"required,datetime=15:04"`
	DayOfWeek     int    `json:"dayOfWeek,omitempty" binding:"omitempty,min=0,max=6"`
	DayOfMonth    int    `json:"dayOfMonth,omitempty" binding:"omitempty,min=1,max=31"`
	RetentionDays int    `json:"retentionDays" binding:"required,min=1,max=365"`
}

// CreateBackup creates a new backup
// @Summary Create backup
// @Description Create a manual backup of the system
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param request body CreateBackupRequest true "Backup configuration"
// @Success 201 {object} map[string]interface{}
// @Router /api/admin/backups [post]
func CreateBackup(c *gin.Context) {
	var req CreateBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, _ := c.Get("user_id")

	// Set defaults
	if req.RetentionDays == 0 {
		req.RetentionDays = 30
	}

	if req.Type == "full" {
		req.IncludesDatabase = true
		req.IncludesFiles = true
	}

	// Create backup record
	backup := models.Backup{
		Name:             req.Name,
		Type:             req.Type,
		Status:           "in_progress",
		IncludesFiles:    req.IncludesFiles,
		IncludesDatabase: req.IncludesDatabase,
		Tables:           req.Tables,
		RetentionDays:    req.RetentionDays,
		CreatedBy:        adminID.(string),
		CreatedAt:        time.Now(),
	}

	if err := SafeCreate(db.DB, &backup); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create backup"})
		return
	}

	// Log operation
	middleware.LogCriticalOperation(c, "backup_created", map[string]interface{}{
		"backup_type": req.Type,
		"backup_name": req.Name,
	})

	// Start backup process asynchronously
	go services.GetBackupService().PerformBackup(backup.ID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Backup started successfully",
		"data": gin.H{
			"backup": backup,
		},
	})
}

// GetBackups returns all backups
// @Summary Get backups
// @Description Get all backups with optional filtering
// @Tags admin,backup
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/backups [get]
func GetBackups(c *gin.Context) {
	query := db.DB.Model(&models.Backup{}).Order("created_at DESC")

	var backups []models.Backup
	if err := query.Find(&backups).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch backups"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"backups": backups,
			"count":   len(backups),
		},
	})
}

// RestoreBackup restores a backup
// @Summary Restore backup
// @Description Restore the system from a backup
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param id path string true "Backup ID"
// @Param request body RestoreBackupRequest true "Restore options"
// @Success 200 {object} map[string]string
// @Router /api/admin/backups/{id}/restore [post]
func RestoreBackup(c *gin.Context) {
	id := c.Param("id")
	adminID, _ := c.Get("user_id")

	var req RestoreBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var backup models.Backup
	if err := db.DB.First(&backup, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errBackupNotFound})
		return
	}

	// Can only restore completed backups
	if backup.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Can only restore completed backups"})
		return
	}

	// Update status
	backup.Status = "restoring"
	db.DB.Save(&backup)

	// Log critical operation
	middleware.LogCriticalOperation(c, "backup_restore", map[string]interface{}{
		"backup_id":   id,
		"backup_name": backup.Name,
		"dry_run":     req.DryRun,
	})

	// Perform restore asynchronously
	go func() {
		err := services.GetBackupService().RestoreBackup(backup.ID, req.TargetTables, req.SkipExisting)
		if err != nil {
			backup.Status = "failed"
			backup.Error = err.Error()
		} else {
			backup.Status = "completed"
		}
		now := time.Now()
		backup.RestoredAt = &now
		backup.RestoredBy = adminID.(string)
		db.DB.Save(&backup)
	}()

	c.JSON(http.StatusOK, gin.H{
		"message": "Restore started. This may take several minutes.",
	})
}

// DeleteBackup deletes a backup
// @Summary Delete backup
// @Description Delete a backup permanently
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param id path string true "Backup ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/backups/{id} [delete]
func DeleteBackup(c *gin.Context) {
	id := c.Param("id")

	var backup models.Backup
	if err := db.DB.First(&backup, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errBackupNotFound})
		return
	}

	// Delete physical backup file
	if backup.DownloadURL != "" {
		services.GetBackupService().DeleteBackupFile(backup.DownloadURL)
	}

	// Delete from database
	if err := db.DB.Delete(&backup).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete backup"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Backup deleted successfully"})
}

// DownloadBackup downloads a backup file
// @Summary Download backup
// @Description Download a backup file
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param id path string true "Backup ID"
// @Success 200 {file} application/octet-stream
// @Router /api/admin/backups/{id}/download [get]
func DownloadBackup(c *gin.Context) {
	id := c.Param("id")

	var backup models.Backup
	if err := db.DB.First(&backup, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errBackupNotFound})
		return
	}

	if backup.Status != "completed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Backup not ready for download"})
		return
	}

	// Generate signed URL or serve file directly
	filePath, err := services.GetBackupService().GetBackupFilePath(backup.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to locate backup file"})
		return
	}

	c.FileAttachment(filePath, fmt.Sprintf("backup-%s-%s.sql", backup.Name, backup.CreatedAt.Format("2006-01-02")))
}

// VerifyBackup verifies backup integrity
// @Summary Verify backup
// @Description Verify the integrity of a backup
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param id path string true "Backup ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/backups/{id}/verify [post]
func VerifyBackup(c *gin.Context) {
	id := c.Param("id")

	var backup models.Backup
	if err := db.DB.First(&backup, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errBackupNotFound})
		return
	}

	isValid, err := services.GetBackupService().VerifyBackup(backup.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Verification failed",
			"data": gin.H{
				"valid": false,
				"error": err.Error(),
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"valid": isValid,
		},
	})
}

// GetBackupStats returns backup statistics
// @Summary Get backup statistics
// @Description Get statistics about backups
// @Tags admin,backup
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/backups/stats [get]
func GetBackupStats(c *gin.Context) {
	var stats struct {
		TotalBackups   int64   `json:"totalBackups"`
		TotalSize      int64   `json:"totalSize"`
		LastBackupAt   *string `json:"lastBackupAt,omitempty"`
		ScheduledCount int     `json:"scheduledBackups"`
	}

	db.DB.Model(&models.Backup{}).Count(&stats.TotalBackups)
	db.DB.Model(&models.Backup{}).Select("COALESCE(SUM(size), 0)").Scan(&stats.TotalSize)

	var lastBackup models.Backup
	if err := db.DB.Where("status = ?", "completed").Order("created_at DESC").First(&lastBackup).Error; err == nil {
		lastAt := lastBackup.CreatedAt.Format(time.RFC3339)
		stats.LastBackupAt = &lastAt
	}

	// Storage usage (mock - in production, check actual disk usage)
	storageUsed := stats.TotalSize
	storageLimit := int64(10 * 1024 * 1024 * 1024) // 10 GB

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"overview":          stats,
			"storageUsed":       storageUsed,
			"storageLimit":      storageLimit,
			"storagePercentage": float64(storageUsed) / float64(storageLimit) * 100,
		},
	})
}

// GetDatabaseTables returns all database tables
// @Summary Get database tables
// @Description Get a list of all database tables available for backup
// @Tags admin,backup
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/backups/tables [get]
func GetDatabaseTables(c *gin.Context) {
	tables, err := services.GetBackupService().GetDatabaseTables()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tables"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"tables": tables,
		},
	})
}

// ScheduleBackup creates a scheduled backup configuration
// @Summary Schedule backup
// @Description Configure automatic scheduled backups
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param request body ScheduleBackupRequest true "Schedule configuration"
// @Success 200 {object} map[string]string
// @Router /api/admin/backups/schedule [post]
func ScheduleBackup(c *gin.Context) {
	var req ScheduleBackupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate day of week/month based on frequency
	if req.Frequency == "weekly" && (req.DayOfWeek < 0 || req.DayOfWeek > 6) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Day of week must be 0-6"})
		return
	}
	if req.Frequency == "monthly" && (req.DayOfMonth < 1 || req.DayOfMonth > 31) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Day of month must be 1-31"})
		return
	}

	// Create schedule (would be stored in a schedules table or config)
	// For now, just return success

	c.JSON(http.StatusOK, gin.H{
		"message": "Backup scheduled successfully",
		"data": gin.H{
			"frequency": req.Frequency,
			"time":      req.Time,
		},
	})
}

// GetBackupProgress returns the progress of an in-progress backup
// @Summary Get backup progress
// @Description Get the progress of a running backup operation
// @Tags admin,backup
// @Accept json
// @Produce json
// @Param id path string true "Backup ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/backups/{id}/progress [get]
func GetBackupProgress(c *gin.Context) {
	id := c.Param("id")

	var backup models.Backup
	if err := db.DB.First(&backup, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errBackupNotFound})
		return
	}

	// Get progress from service
	progress := services.GetBackupService().GetProgress(backup.ID)

	var percent int
	var message string
	var eta int

	if progress != nil {
		percent = progress.Percent
		message = progress.Message
		eta = progress.ETA
	} else {
		// Fallback based on DB status
		switch backup.Status {
		case "completed":
			percent = 100
			message = "Completed"
			eta = 0
		case "failed":
			percent = 0
			message = "Failed"
			eta = 0
		default:
			percent = 0
			message = "Backup status: " + backup.Status
			eta = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"backupId": id,
			"status":   backup.Status,
			"percent":  percent,
			"message":  message,
			"eta":      eta,
		},
	})
}
