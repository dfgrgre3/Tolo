package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
)

// GenerateTicketNumber generates a unique ticket number
func GenerateTicketNumber() string {
	// Format: TK-YYYY-XXXXX
	// TK = Ticket prefix
	// YYYY = Year
	// XXXXX = Random 5 digit number

	year := time.Now().Year()
	random := uuid.New().String()[:5]

	return fmt.Sprintf("TK-%d-%s", year, random)
}
