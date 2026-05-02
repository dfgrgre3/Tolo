package services

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

type EmailService struct {
	enabled   bool
	host      string
	port      string
	username  string
	password  string
	fromEmail string
	fromName  string
}

var emailServiceInstance *EmailService

func GetEmailService() *EmailService {
	if emailServiceInstance == nil {
		emailServiceInstance = &EmailService{
			enabled:   os.Getenv("SMTP_ENABLED") == "true",
			host:      os.Getenv("SMTP_HOST"),
			port:      os.Getenv("SMTP_PORT"),
			username:  os.Getenv("SMTP_USERNAME"),
			password:  os.Getenv("SMTP_PASSWORD"),
			fromEmail: os.Getenv("SMTP_FROM_EMAIL"),
			fromName:  os.Getenv("SMTP_FROM_NAME"),
		}
	}
	return emailServiceInstance
}

// SendEmail sends an email to a single recipient
func (s *EmailService) SendEmail(to string, subject string, body string, isHTML bool) error {
	if !s.enabled {
		return fmt.Errorf("email service is not enabled")
	}

	if s.host == "" || s.username == "" {
		return fmt.Errorf("SMTP configuration is incomplete")
	}

	// Build message
	contentType := "text/plain; charset=UTF-8"
	if isHTML {
		contentType = "text/html; charset=UTF-8"
	}

	msg := fmt.Sprintf("From: %s <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"Content-Type: %s\r\n\r\n"+
		"%s",
		s.fromName, s.fromEmail, to, subject, contentType, body)

	// SMTP authentication
	auth := smtp.PlainAuth("", s.username, s.password, s.host)

	// Send email
	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	err := smtp.SendMail(addr, auth, s.fromEmail, []string{to}, []byte(msg))
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// SendBulkEmail sends the same email to multiple recipients
func (s *EmailService) SendBulkEmail(to []string, subject string, body string, isHTML bool) map[string]error {
	results := make(map[string]error)

	for _, recipient := range to {
		err := s.SendEmail(recipient, subject, body, isHTML)
		results[recipient] = err
	}

	return results
}

// SendTemplateEmail sends an email using a template
func (s *EmailService) SendTemplateEmail(to string, subject string, templateName string, data map[string]interface{}) error {
	// TODO: Implement template rendering
	// For now, just send a simple message
	body := fmt.Sprintf("رسالة من المنصة التعليمية\nالقالب: %s\nالبيانات: %v", templateName, data)
	return s.SendEmail(to, subject, body, false)
}

// BuildNotificationEmail builds a notification email body
func (s *EmailService) BuildNotificationEmail(title string, message string, actionURL string) string {
	return fmt.Sprintf(`
		<div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
			<h2 style="color: #333;">%s</h2>
			<p style="color: #666; line-height: 1.6;">%s</p>
			%s
			<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
			<p style="color: #999; font-size: 12px;">هذه رسالة آلية من منصة التعلّم</p>
		</div>
	`, title, message, func() string {
		if actionURL != "" {
			return fmt.Sprintf(`<a href="%s" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">تحقق من التفاصيل</a>`, actionURL)
		}
		return ""
	}())
}

// ValidateEmail checks if an email address is valid (basic check)
func (s *EmailService) ValidateEmail(email string) bool {
	return strings.Contains(email, "@") && strings.Contains(email, ".")
}