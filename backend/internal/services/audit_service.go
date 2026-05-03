package services

import (
	"encoding/json"
	"log"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

// Audit Event Types
const (
	AuditEventLogin          = "auth.login"
	AuditEventLogout         = "auth.logout"
	AuditEventLoginFailed    = "auth.login_failed"
	AuditEventPasswordChange = "user.password_change"
	AuditEventProfileUpdate  = "user.profile_update"
	AuditEventPaymentStarted = "payment.started"
	AuditEventPaymentSuccess = "payment.success"
	AuditEventPaymentFailed  = "payment.failed"
	AuditEventExamStarted    = "exam.started"
	AuditEventExamFinished   = "exam.finished"
	AuditEventAdminAction    = "admin.action"
	AuditEventDataDeletion   = "data.deletion"
)

type AuditService struct{}

var auditServiceInstance *AuditService

func GetAuditService() *AuditService {
	if auditServiceInstance == nil {
		auditServiceInstance = &AuditService{}
	}
	return auditServiceInstance
}

// LogEvent records a new audit log entry
func (s *AuditService) LogEvent(userID, eventType, resource, resourceID string, metadata interface{}, ip, userAgent string) {
	metadataJSON := ""
	if metadata != nil {
		bytes, err := json.Marshal(metadata)
		if err == nil {
			metadataJSON = string(bytes)
		}
	}

	auditLog := models.AuditLog{
		UserID:     userID,
		EventType:  eventType,
		Action:     eventType,
		Resource:   resource,
		ResourceID: resourceID,
		Metadata:   metadataJSON,
		IP:         ip,
		UserAgent:  userAgent,
	}

	// Save to DB (Synchronous for now to ensure reliability)
	if err := db.DB.Create(&auditLog).Error; err != nil {
		log.Printf("Failed to save audit log: %v", err)
	}
}

// LogAsync records an audit log without blocking the main thread
func (s *AuditService) LogAsync(userID, eventType, resource, resourceID string, metadata interface{}, ip, userAgent string) {
	go s.LogEvent(userID, eventType, resource, resourceID, metadata, ip, userAgent)
}
