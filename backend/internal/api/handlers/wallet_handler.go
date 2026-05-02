package handlers

import (
	"net/http"
	"strconv"
	api_response "thanawy-backend/internal/api/response"
	"thanawy-backend/internal/models"
	"thanawy-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type ProcessWalletRequest struct {
	UserID      string  `json:"userId" binding:"required"`
	Amount      float64 `json:"amount" binding:"required"`
	Type        string  `json:"type" binding:"required"`       // DEPOSIT, WITHDRAW, REFUND, AI_USAGE, EXAM_USAGE
	WalletType  string  `json:"walletType" binding:"required"` // BALANCE, AI_CREDITS, EXAM_CREDITS
	Description string  `json:"description"`
	ReferenceID *string `json:"referenceId"`
}

// ProcessWalletTransaction modifies user balance securely
func ProcessWalletTransaction(c *gin.Context) {
	var req ProcessWalletRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api_response.Error(c, http.StatusBadRequest, "Invalid request: "+err.Error())
		return
	}

	// Verify wallet type
	if req.WalletType != "BALANCE" && req.WalletType != "AI_CREDITS" && req.WalletType != "EXAM_CREDITS" {
		api_response.Error(c, http.StatusBadRequest, "Invalid wallet type")
		return
	}

	transactionType := models.TransactionType(req.Type)

	record, err := services.ProcessWalletTransaction(
		req.UserID,
		req.Amount,
		transactionType,
		req.WalletType,
		req.Description,
		req.ReferenceID,
	)

	if err != nil {
		if err == services.ErrInsufficientBalance {
			api_response.Error(c, http.StatusPaymentRequired, err.Error())
			return
		}
		if err == services.ErrOptimisticLock {
			api_response.Error(c, http.StatusConflict, err.Error())
			return
		}
		api_response.Error(c, http.StatusInternalServerError, "Failed to process transaction: "+err.Error())
		return
	}

	LogAudit(c, "CREATE", "wallet_transaction", record.ID, record)
	api_response.Success(c, gin.H{"transaction": record})
}

// GetUserWalletTransactions lists wallet history for a user
func GetUserWalletTransactions(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		// Fallback to authenticated user
		if uid, exists := c.Get("userId"); exists {
			userID = uid.(string)
		} else {
			api_response.Error(c, http.StatusUnauthorized, "User ID is required")
			return
		}
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	transactions, total, err := services.GetUserWalletTransactions(userID, limit, offset)
	if err != nil {
		api_response.Error(c, http.StatusInternalServerError, "Failed to fetch transactions")
		return
	}

	api_response.List(c, transactions, api_response.Pagination{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: calculateTotalPages(total, limit),
	}, nil)
}
