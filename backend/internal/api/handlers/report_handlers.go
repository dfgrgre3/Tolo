package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
)

const errReportNotFound = "Report not found"

// ReportWidget represents a single widget in a report
type ReportWidget struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type" binding:"required,oneof=table bar line pie area metric"`
	Title      string                 `json:"title" binding:"required"`
	DataSource string                 `json:"dataSource" binding:"required"`
	Metrics    []ReportMetric         `json:"metrics" binding:"required"`
	Dimensions []ReportDimension      `json:"dimensions,omitempty"`
	Filters    []ReportFilter         `json:"filters,omitempty"`
	Sort       *ReportSort            `json:"sort,omitempty"`
	Limit      int                    `json:"limit,omitempty"`
	Layout     map[string]interface{} `json:"layout" binding:"required"`
}

// ReportMetric represents a metric configuration
type ReportMetric struct {
	Name        string `json:"name" binding:"required"`
	Field       string `json:"field" binding:"required"`
	Aggregation string `json:"aggregation" binding:"required,oneof=count sum avg min max distinct_count"`
	Format      string `json:"format,omitempty" binding:"omitempty,oneof=number currency percentage date"`
}

// ReportDimension represents a dimension configuration
type ReportDimension struct {
	Field  string `json:"field" binding:"required"`
	Label  string `json:"label" binding:"required"`
	Format string `json:"format,omitempty" binding:"omitempty,oneof=date text number"`
}

// ReportFilter represents a filter condition
type ReportFilter struct {
	Field    string      `json:"field" binding:"required"`
	Operator string      `json:"operator" binding:"required,oneof=equals not_equals contains greater_than less_than between in"`
	Value    interface{} `json:"value" binding:"required"`
}

// ReportSort represents sort configuration
type ReportSort struct {
	Field     string `json:"field" binding:"required"`
	Direction string `json:"direction" binding:"required,oneof=asc desc"`
}

// CustomReportRequest represents a request to create/update a report
type CustomReportRequest struct {
	Name        string         `json:"name" binding:"required,max=100"`
	Description string         `json:"description" binding:"max=500"`
	Widgets     []ReportWidget `json:"widgets" binding:"required,min=1"`
	Filters     []ReportFilter `json:"filters,omitempty"`
	DateRange   *struct {
		From time.Time `json:"from"`
		To   time.Time `json:"to"`
	} `json:"dateRange,omitempty"`
	IsPublic bool `json:"isPublic"`
	Schedule *struct {
		Frequency string   `json:"frequency" binding:"required,oneof=daily weekly monthly"`
		EmailTo   []string `json:"emailTo" binding:"required,min=1"`
	} `json:"schedule,omitempty"`
}

// CreateCustomReport creates a new custom report
// @Summary Create custom report
// @Description Create a new custom report with widgets and filters
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param request body CustomReportRequest true "Report configuration"
// @Success 201 {object} map[string]interface{}
// @Router /api/admin/reports [post]
func CreateCustomReport(c *gin.Context) {
	var req CustomReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	adminID, _ := c.Get("user_id")

	report := models.CustomReport{
		Name:        req.Name,
		Description: req.Description,
		Widgets:     widgetsToJSON(req.Widgets),
		Filters:     filtersToJSON(req.Filters),
		CreatedBy:   adminID.(string),
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		IsPublic:    req.IsPublic,
	}

	if req.DateRange != nil {
		report.DateRangeFrom = &req.DateRange.From
		report.DateRangeTo = &req.DateRange.To
	}

	if req.Schedule != nil {
		report.ScheduleFrequency = req.Schedule.Frequency
		report.ScheduleEmailTo = req.Schedule.EmailTo
	}

	if err := db.DB.Create(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create report"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Report created successfully",
		"data": gin.H{
			"report": report,
		},
	})
}

// GetCustomReports returns all custom reports
// @Summary Get custom reports
// @Description Get all custom reports with optional filtering
// @Tags admin,reports
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/reports [get]
func GetCustomReports(c *gin.Context) {
	adminID, exists := c.Get("user_id")

	query := db.DB.Model(&models.CustomReport{})

	// Users can see their own reports + public reports
	if exists {
		query = query.Where("created_by = ? OR is_public = ?", adminID, true)
	}

	var reports []models.CustomReport
	if err := query.Order("updated_at DESC").Find(&reports).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"reports": reports,
		},
	})
}

// GetCustomReport returns a single report
// @Summary Get custom report
// @Description Get a specific custom report by ID
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/reports/{id} [get]
func GetCustomReport(c *gin.Context) {
	id := c.Param("id")

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"report": report,
		},
	})
}

// UpdateCustomReport updates a custom report
// @Summary Update custom report
// @Description Update an existing custom report
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Param request body CustomReportRequest true "Updated report configuration"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/reports/{id} [patch]
func UpdateCustomReport(c *gin.Context) {
	id := c.Param("id")

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	var req CustomReportRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	report.Name = req.Name
	report.Description = req.Description
	report.Widgets = widgetsToJSON(req.Widgets)
	report.Filters = filtersToJSON(req.Filters)
	report.IsPublic = req.IsPublic
	report.UpdatedAt = time.Now()

	if req.DateRange != nil {
		report.DateRangeFrom = &req.DateRange.From
		report.DateRangeTo = &req.DateRange.To
	}

	if req.Schedule != nil {
		report.ScheduleFrequency = req.Schedule.Frequency
		report.ScheduleEmailTo = req.Schedule.EmailTo
	}

	if err := db.DB.Save(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Report updated successfully",
		"data": gin.H{
			"report": report,
		},
	})
}

// DeleteCustomReport deletes a custom report
// @Summary Delete custom report
// @Description Delete a custom report permanently
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Success 200 {object} map[string]string
// @Router /api/admin/reports/{id} [delete]
func DeleteCustomReport(c *gin.Context) {
	id := c.Param("id")

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	if err := db.DB.Delete(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Report deleted successfully"})
}

// ExecuteCustomReport executes a custom report and returns results
// @Summary Execute custom report
// @Description Execute a custom report and get the results
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/reports/{id}/execute [post]
func ExecuteCustomReport(c *gin.Context) {
	id := c.Param("id")

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	// Update last run time
	now := time.Now()
	report.LastRunAt = &now
	db.DB.Save(&report)

	// Execute each widget
	results := make(map[string]interface{})
	var widgets []ReportWidget
	if err := json.Unmarshal(report.Widgets, &widgets); err == nil {
		for _, widget := range widgets {
			data, summary := executeWidgetQuery(widget)
			results[widget.ID] = gin.H{
				"data":    data,
				"summary": summary,
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"result": gin.H{
				"reportId":   report.ID,
				"executedAt": now,
				"results":    results,
			},
		},
	})
}

// ExportCustomReport exports a report in various formats
// @Summary Export custom report
// @Description Export a custom report to PDF, Excel, or CSV
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Param format query string true "Export format (pdf|excel|csv)"
// @Success 200 {object} map[string]interface{}
// @Router /api/admin/reports/{id}/export [get]
func ExportCustomReport(c *gin.Context) {
	id := c.Param("id")
	format := c.Query("format")

	if format == "" {
		format = "csv"
	}

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	switch format {
	case "csv":
		exportToCSV(c, report)
	case "excel":
		exportToExcel(c, report)
	case "pdf":
		exportToPDF(c, report)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid format"})
	}
}

// ScheduleCustomReport schedules automatic report generation
// @Summary Schedule report
// @Description Schedule automatic report generation and email delivery
// @Tags admin,reports
// @Accept json
// @Produce json
// @Param id path string true "Report ID"
// @Param request body map[string]interface{} true "Schedule configuration"
// @Success 200 {object} map[string]string
// @Router /api/admin/reports/{id}/schedule [post]
func ScheduleCustomReport(c *gin.Context) {
	id := c.Param("id")

	var report models.CustomReport
	if err := db.DB.First(&report, idQuery, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": errReportNotFound})
		return
	}

	var req struct {
		Frequency string   `json:"frequency" binding:"required,oneof=daily weekly monthly"`
		EmailTo   []string `json:"emailTo" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	report.ScheduleFrequency = req.Frequency
	report.ScheduleEmailTo = req.EmailTo

	if err := db.DB.Save(&report).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule report"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Report scheduled successfully"})
}

// Helper functions
func widgetsToJSON(widgets []ReportWidget) []byte {
	data, _ := json.Marshal(widgets)
	return data
}

func filtersToJSON(filters []ReportFilter) []byte {
	data, _ := json.Marshal(filters)
	return data
}

func executeWidgetQuery(widget ReportWidget) ([]map[string]interface{}, map[string]float64) {
	// Simplified implementation - in production, this would build actual SQL queries
	// based on the widget configuration

	// Return mock data for now
	data := []map[string]interface{}{
		{"label": "Item 1", "value": 100},
		{"label": "Item 2", "value": 200},
	}

	summary := map[string]float64{
		"total": 300,
		"avg":   150,
	}

	return data, summary
}

func exportToCSV(c *gin.Context, report models.CustomReport) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s.csv", report.Name))
	c.String(http.StatusOK, "label,value\nItem 1,100\nItem 2,200\n")
}

func exportToExcel(c *gin.Context, report models.CustomReport) {
	// In production, use a library like excelize to generate Excel files
	c.JSON(http.StatusNotImplemented, gin.H{"error": "Excel export not yet implemented"})
}

func exportToPDF(c *gin.Context, report models.CustomReport) {
	// In production, use a library like gofpdf or headless Chrome to generate PDFs
	c.JSON(http.StatusNotImplemented, gin.H{"error": "PDF export not yet implemented"})
}
