package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

const startedAtGteQuery = "started_at >= ?"
const countDistinctUserQuery = "COUNT(DISTINCT user_id)"

// UserJourneyRequest represents a user journey tracking request
type UserJourneyRequest struct {
	UserID         string            `json:"userId" binding:"required"`
	SessionID      string            `json:"sessionId" binding:"required"`
	StartedAt      time.Time         `json:"startedAt" binding:"required"`
	EndedAt        *time.Time        `json:"endedAt,omitempty"`
	Steps          []UserJourneyStep `json:"steps" binding:"required"`
	TotalDuration  int64             `json:"totalDuration"`
	ConversionGoal string            `json:"conversionGoal,omitempty"`
	Completed      bool              `json:"completed"`
}

// UserJourneyStep represents a single step in the user journey
type UserJourneyStep struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"userId"`
	SessionID string                 `json:"sessionId"`
	Page      string                 `json:"page"`
	Action    string                 `json:"action"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
	Duration  *int64                 `json:"duration,omitempty"`
}

// ConversionEventRequest represents a conversion event
type ConversionEventRequest struct {
	UserID       string    `json:"userId" binding:"required"`
	SessionID    string    `json:"sessionId" binding:"required"`
	Goal         string    `json:"goal" binding:"required"`
	Value        float64   `json:"value,omitempty"`
	Timestamp    time.Time `json:"timestamp" binding:"required"`
	JourneySteps int       `json:"journeySteps"`
}

// TrackUserJourney saves a complete user journey for analysis
// @Summary Track user journey
// @Description Save a complete user journey session for analytics
// @Tags admin,analytics
// @Accept json
// @Produce json
// @Param request body UserJourneyRequest true "User journey data"
// @Success 201 {object} map[string]string
// @Router /api/admin/analytics/journey [post]
func TrackUserJourney(c *gin.Context) {
	var req UserJourneyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save journey to database
	journey := models.UserJourney{
		UserID:         req.UserID,
		SessionID:      req.SessionID,
		StartedAt:      req.StartedAt,
		EndedAt:        req.EndedAt,
		TotalDuration:  req.TotalDuration,
		ConversionGoal: req.ConversionGoal,
		Completed:      req.Completed,
		Steps:          make([]models.UserJourneyStep, len(req.Steps)),
	}

	for i, step := range req.Steps {
		journey.Steps[i] = models.UserJourneyStep{
			ID:        step.ID,
			UserID:    step.UserID,
			SessionID: step.SessionID,
			Page:      step.Page,
			Action:    step.Action,
			Metadata:  step.Metadata,
			Timestamp: step.Timestamp,
			Duration:  step.Duration,
		}
	}

	if err := db.WriteDB().Create(&journey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save journey"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Journey tracked successfully",
		"journeyId": journey.ID,
	})
}

// TrackConversionEvent tracks a conversion event
// @Summary Track conversion event
// @Description Track when a user completes a conversion goal
// @Tags admin,analytics
// @Accept json
// @Produce json
// @Param request body ConversionEventRequest true "Conversion event data"
// @Success 201 {object} map[string]string
// @Router /api/admin/analytics/conversion [post]
func TrackConversionEvent(c *gin.Context) {
	var req ConversionEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save conversion event
	conversion := models.ConversionEvent{
		UserID:       req.UserID,
		SessionID:    req.SessionID,
		Goal:         req.Goal,
		Value:        req.Value,
		Timestamp:    req.Timestamp,
		JourneySteps: req.JourneySteps,
	}

	if err := db.WriteDB().Create(&conversion).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save conversion"})
		return
	}

	// Log critical conversion for admin tracking
	middleware.LogCriticalOperation(c, "conversion_achieved", map[string]interface{}{
		"user_id":       req.UserID,
		"goal":          req.Goal,
		"value":         req.Value,
		"journey_steps": req.JourneySteps,
	})

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Conversion tracked successfully",
		"conversionId": conversion.ID,
	})
}

// GetUserJourneys returns user journeys with filtering
// @Summary Get user journeys
// @Description Get user journey data with filtering options
// @Tags admin,analytics
// @Accept json
// @Produce json
// @Param userId query string false "Filter by user ID"
// @Param from query string false "Filter from date (RFC3339)"
// @Param to query string false "Filter to date (RFC3339)"
// @Param goal query string false "Filter by conversion goal"
// @Param completed query bool false "Filter by completion status"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/analytics/journeys [get]
func GetUserJourneys(c *gin.Context) {
	userID := c.Query("userId")
	from := c.Query("from")
	to := c.Query("to")
	goal := c.Query("goal")
	completed := c.Query("completed")

	query := db.ReadDB().Model(&models.UserJourney{}).Preload("Steps")

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	if from != "" {
		if fromTime, err := time.Parse(time.RFC3339, from); err == nil {
			query = query.Where(startedAtGteQuery, fromTime)
		}
	}

	if to != "" {
		if toTime, err := time.Parse(time.RFC3339, to); err == nil {
			query = query.Where("started_at <= ?", toTime)
		}
	}

	if goal != "" {
		query = query.Where("conversion_goal = ?", goal)
	}

	if completed != "" {
		if completed == "true" {
			query = query.Where("completed = ?", true)
		} else if completed == "false" {
			query = query.Where("completed = ?", false)
		}
	}

	query = query.Order("started_at DESC")

	var journeys []models.UserJourney
	if err := query.Find(&journeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journeys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"journeys": journeys,
			"count":    len(journeys),
		},
	})
}

// GetActivityMetrics returns aggregated activity metrics
// @Summary Get activity metrics
// @Description Get aggregated user activity metrics
// @Tags admin,analytics
// @Accept json
// @Produce json
// @Param from query string false "From date (RFC3339)"
// @Param to query string false "To date (RFC3339)"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/analytics/metrics [get]
func GetActivityMetrics(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")

	var fromTime, toTime time.Time
	if from != "" {
		fromTime, _ = time.Parse(time.RFC3339, from)
	} else {
		fromTime = time.Now().AddDate(0, 0, -30) // Default to last 30 days
	}

	if to != "" {
		toTime, _ = time.Parse(time.RFC3339, to)
	} else {
		toTime = time.Now()
	}

	metrics := calculateActivityMetrics(fromTime, toTime)

	c.JSON(http.StatusOK, gin.H{
		"data": metrics,
	})
}

// calculateActivityMetrics calculates various activity metrics
type ActivityMetrics struct {
	DailyActiveUsers       int64              `json:"dailyActiveUsers"`
	WeeklyActiveUsers      int64              `json:"weeklyActiveUsers"`
	MonthlyActiveUsers     int64              `json:"monthlyActiveUsers"`
	AverageSessionDuration float64            `json:"averageSessionDuration"`
	BounceRate             float64            `json:"bounceRate"`
	TopPages               []PageStats        `json:"topPages"`
	UserFlows              []FlowStats        `json:"userFlows"`
	ConversionRates        map[string]float64 `json:"conversionRates"`
}

type PageStats struct {
	Page           string  `json:"page"`
	Views          int64   `json:"views"`
	UniqueVisitors int64   `json:"uniqueVisitors"`
	AvgDuration    float64 `json:"avgDuration"`
}

type FlowStats struct {
	From  string `json:"from"`
	To    string `json:"to"`
	Count int64  `json:"count"`
}

func calculateActivityMetrics(from, to time.Time) ActivityMetrics {
	metrics := ActivityMetrics{
		TopPages:        []PageStats{},
		UserFlows:       []FlowStats{},
		ConversionRates: make(map[string]float64),
	}

	// Calculate DAU, WAU, MAU
	now := time.Now()
	db.ReadDB().Model(&models.UserJourney{}).
		Where(startedAtGteQuery, now.AddDate(0, 0, -1)).
		Select(countDistinctUserQuery).
		Scan(&metrics.DailyActiveUsers)

	db.ReadDB().Model(&models.UserJourney{}).
		Where(startedAtGteQuery, now.AddDate(0, 0, -7)).
		Select(countDistinctUserQuery).
		Scan(&metrics.WeeklyActiveUsers)

	db.ReadDB().Model(&models.UserJourney{}).
		Where(startedAtGteQuery, now.AddDate(0, 0, -30)).
		Select(countDistinctUserQuery).
		Scan(&metrics.MonthlyActiveUsers)

	// Calculate average session duration
	db.ReadDB().Model(&models.UserJourney{}).
		Where("started_at >= ? AND started_at <= ?", from, to).
		Select("AVG(total_duration)").
		Scan(&metrics.AverageSessionDuration)

	// Calculate bounce rate (sessions with only 1 step)
	var totalSessions, bouncedSessions int64
	db.ReadDB().Model(&models.UserJourney{}).
		Where("started_at >= ? AND started_at <= ?", from, to).
		Count(&totalSessions)

	db.ReadDB().Model(&models.UserJourney{}).
		Where("started_at >= ? AND started_at <= ? AND (SELECT COUNT(*) FROM user_journey_steps WHERE user_journey_id = user_journeys.id) = 1", from, to).
		Count(&bouncedSessions)

	if totalSessions > 0 {
		metrics.BounceRate = float64(bouncedSessions) / float64(totalSessions) * 100
	}

	// Top pages
	db.ReadDB().Raw(`
		SELECT page, COUNT(*) as views, COUNT(DISTINCT user_id) as unique_visitors
		FROM user_journey_steps
		WHERE timestamp >= ? AND timestamp <= ?
		GROUP BY page
		ORDER BY views DESC
		LIMIT 10
	`, from, to).Scan(&metrics.TopPages)

	// User flows (page transitions)
	db.ReadDB().Raw(`
		WITH step_pairs AS (
			SELECT 
				l.page as from_page,
				LEAD(l.page) OVER (PARTITION BY l.session_id ORDER BY l.timestamp) as to_page
			FROM user_journey_steps l
			WHERE l.timestamp >= ? AND l.timestamp <= ?
		)
		SELECT from_page as from, to_page as to, COUNT(*) as count
		FROM step_pairs
		WHERE to_page IS NOT NULL
		GROUP BY from_page, to_page
		ORDER BY count DESC
		LIMIT 20
	`, from, to).Scan(&metrics.UserFlows)

	// Conversion rates by goal
	var goals []struct {
		Goal     string
		Total    int64
		Achieved int64
	}
	db.ReadDB().Raw(`
		SELECT 
			conversion_goal as goal,
			COUNT(*) as total,
			SUM(CASE WHEN completed THEN 1 ELSE 0 END) as achieved
		FROM user_journeys
		WHERE started_at >= ? AND started_at <= ? AND conversion_goal IS NOT NULL
		GROUP BY conversion_goal
	`, from, to).Scan(&goals)

	for _, g := range goals {
		if g.Total > 0 {
			metrics.ConversionRates[g.Goal] = float64(g.Achieved) / float64(g.Total) * 100
		}
	}

	return metrics
}

// ExportJourneys exports journey data for analysis
// @Summary Export user journeys
// @Description Export user journey data to CSV or JSON
// @Tags admin,analytics
// @Accept json
// @Produce json
// @Param format query string false "Export format (csv|json)"
// @Param request body map[string]interface{} false "Filter parameters"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/analytics/journeys/export [post]
func ExportJourneys(c *gin.Context) {
	format := c.Query("format")
	if format == "" {
		format = "csv"
	}

	var filters struct {
		UserID string    `json:"userId"`
		From   time.Time `json:"from"`
		To     time.Time `json:"to"`
	}

	if err := c.ShouldBindJSON(&filters); err != nil {
		// Continue without filters
	}

	// Fetch journeys
	query := db.ReadDB().Model(&models.UserJourney{}).Preload("Steps")

	if filters.UserID != "" {
		query = query.Where("user_id = ?", filters.UserID)
	}

	if !filters.From.IsZero() {
		query = query.Where(startedAtGteQuery, filters.From)
	}

	if !filters.To.IsZero() {
		query = query.Where("started_at <= ?", filters.To)
	}

	var journeys []models.UserJourney
	if err := query.Find(&journeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journeys"})
		return
	}

	// Export based on format
	switch format {
	case "json":
		c.JSON(http.StatusOK, gin.H{
			"journeys": journeys,
		})
	case "csv":
		// Generate CSV
		csvData := generateJourneysCSV(journeys)
		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", "attachment; filename=journeys.csv")
		c.String(http.StatusOK, csvData)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format"})
	}
}

func generateJourneysCSV(journeys []models.UserJourney) string {
	// Simple CSV generation - in production, use a proper CSV library
	var csv string
	csv += "journey_id,user_id,session_id,started_at,ended_at,duration,completed,goal,step_id,step_page,step_action,step_timestamp\n"

	for _, journey := range journeys {
		if len(journey.Steps) == 0 {
			csv += formatJourneyRow(journey, models.UserJourneyStep{}) + "\n"
		} else {
			for _, step := range journey.Steps {
				csv += formatJourneyRow(journey, step) + "\n"
			}
		}
	}

	return csv
}

func formatJourneyRow(journey models.UserJourney, step models.UserJourneyStep) string {
	// Simplified - escape properly in production
	return journey.ID + "," +
		journey.UserID + "," +
		journey.SessionID + "," +
		journey.StartedAt.Format(time.RFC3339) + "," +
		journey.EndedAt.Format(time.RFC3339) + "," +
		string(rune(journey.TotalDuration)) + "," +
		func() string {
			if journey.Completed {
				return "true"
			} else {
				return "false"
			}
		}() + "," +
		journey.ConversionGoal + "," +
		step.ID + "," +
		step.Page + "," +
		step.Action + "," +
		step.Timestamp.Format(time.RFC3339)
}
