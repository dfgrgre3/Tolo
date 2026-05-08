package services

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

const queryIDEquals = "id = ?"

// BackupProgress tracks backup progress
type BackupProgress struct {
	BackupID string
	Percent  int
	Message  string
	ETA      int // seconds
}

// BackupService handles backup operations
type BackupService struct {
	progress map[string]*BackupProgress
	basePath string
}

var backupServiceInstance *BackupService

// GetBackupService returns the singleton backup service
func GetBackupService() *BackupService {
	if backupServiceInstance == nil {
		backupServiceInstance = &BackupService{
			progress: make(map[string]*BackupProgress),
			basePath: os.Getenv("BACKUP_PATH"),
		}
		if backupServiceInstance.basePath == "" {
			backupServiceInstance.basePath = "./backups"
		}
		// Ensure backup directory exists
		os.MkdirAll(backupServiceInstance.basePath, 0755)
	}
	return backupServiceInstance
}

// PerformBackup performs a backup operation
func (s *BackupService) PerformBackup(backupID string) error {
	var backup models.Backup
	if err := db.DB.First(&backup, queryIDEquals, backupID).Error; err != nil {
		return err
	}

	// Initialize progress
	s.progress[backupID] = &BackupProgress{
		BackupID: backupID,
		Percent:  0,
		Message:  "Starting backup...",
		ETA:      300,
	}

	// Simulate backup process
	// In production, this would:
	// 1. Dump database using pg_dump or mysqldump
	// 2. Copy files to backup location
	// 3. Compress the backup
	// 4. Calculate checksum

	steps := []struct {
		message string
		percent int
		delay   time.Duration
	}{
		{"Preparing backup...", 10, 1 * time.Second},
		{"Dumping database...", 40, 3 * time.Second},
		{"Copying files...", 70, 3 * time.Second},
		{"Compressing backup...", 90, 2 * time.Second},
		{"Calculating checksum...", 95, 1 * time.Second},
		{"Finalizing...", 100, 500 * time.Millisecond},
	}

	for _, step := range steps {
		s.progress[backupID].Message = step.message
		s.progress[backupID].Percent = step.percent
		time.Sleep(step.delay)
	}

	// Generate file info
	backup.Status = "completed"
	backup.Size = 1024 * 1024 * 50 // 50 MB (mock)
	backup.Checksum = s.generateChecksum(backupID)
	backupPath := filepath.Join(s.basePath, fmt.Sprintf("backup-%s.sql.gz", backupID))
	backup.DownloadURL = backupPath

	now := time.Now()
	backup.CompletedAt = &now

	return db.DB.Save(&backup).Error
}

// RestoreBackup restores from a backup
func (s *BackupService) RestoreBackup(backupID string, targetTables []string, skipExisting bool) error {
	var backup models.Backup
	if err := db.DB.First(&backup, queryIDEquals, backupID).Error; err != nil {
		return err
	}

	// In production, this would:
	// 1. Verify backup integrity
	// 2. Create a restore point for rollback
	// 3. Restore database from dump
	// 4. Restore files if included

	fmt.Printf("[Backup] Restoring from backup: %s\n", backup.Name)
	fmt.Printf("[Backup] Target tables: %v\n", targetTables)
	fmt.Printf("[Backup] Skip existing: %v\n", skipExisting)

	// Simulate restore process
	time.Sleep(5 * time.Second)

	return nil
}

// VerifyBackup verifies backup integrity
func (s *BackupService) VerifyBackup(backupID string) (bool, error) {
	var backup models.Backup
	if err := db.DB.First(&backup, queryIDEquals, backupID).Error; err != nil {
		return false, err
	}

	// In production, this would:
	// 1. Check if file exists
	// 2. Verify file is not corrupted
	// 3. Verify checksum matches

	// Mock verification
	return backup.Status == "completed" && backup.Checksum != "", nil
}

// GetProgress returns the progress of a backup operation
func (s *BackupService) GetProgress(backupID string) *BackupProgress {
	return s.progress[backupID]
}

// GetDatabaseTables returns a list of database tables
func (s *BackupService) GetDatabaseTables() ([]string, error) {
	// In production, query information_schema or use GORM to get tables
	// Mock tables
	tables := []string{
		"users",
		"subjects",
		"exams",
		"courses",
		"payments",
		"notifications",
		"support_tickets",
		"scheduled_items",
		"backups",
	}
	return tables, nil
}

// DeleteBackupFile deletes a backup file
func (s *BackupService) DeleteBackupFile(path string) error {
	return os.Remove(path)
}

// GetBackupFilePath returns the file path for a backup
func (s *BackupService) GetBackupFilePath(backupID string) (string, error) {
	return filepath.Join(s.basePath, fmt.Sprintf("backup-%s.sql.gz", backupID)), nil
}

// generateChecksum generates a SHA256 checksum
func (s *BackupService) generateChecksum(data string) string {
	hash := sha256.Sum256([]byte(data + time.Now().String()))
	return hex.EncodeToString(hash[:])
}
