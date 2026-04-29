package repository

import (
	"thanawy-backend/internal/models"
	"gorm.io/gorm"
)

type SecurityLogRepository struct {
	db *gorm.DB
}

func NewSecurityLogRepository(db *gorm.DB) *SecurityLogRepository {
	return &SecurityLogRepository{db: db}
}

func (r *SecurityLogRepository) Create(log *models.SecurityLog) error {
	return r.db.Create(log).Error
}

func (r *SecurityLogRepository) FindByUserID(userID string, limit int) ([]models.SecurityLog, error) {
	var logs []models.SecurityLog
	query := r.db.Where("\"userId\" = ?", userID).Order("\"createdAt\" desc")
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&logs).Error
	return logs, err
}

func (r *SecurityLogRepository) FindAll(limit int, offset int) ([]models.SecurityLog, int64, error) {
	var logs []models.SecurityLog
	var count int64
	
	err := r.db.Model(&models.SecurityLog{}).Count(&count).Error
	if err != nil {
		return nil, 0, err
	}
	
	err = r.db.Order("\"createdAt\" desc").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, count, err
}
