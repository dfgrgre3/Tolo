package pagination

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// CursorPagination provides cursor-based pagination for large datasets
type CursorPagination struct {
	Cursor    string `json:"cursor"`     // Encoded cursor
	Limit     int    `json:"limit"`      // Items per page
	Direction string `json:"direction"`  // next | prev
	SortField string `json:"sort_field"` // Field to sort by
	SortOrder string `json:"sort_order"` // asc | desc
}

// CursorData contains the decoded cursor information
type CursorData struct {
	ID        interface{} `json:"id"`
	Value     interface{} `json:"value"`
	SortField string      `json:"sort_field"`
}

// PaginatedResponse is the standard paginated response format
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Pagination struct {
		NextCursor string `json:"next_cursor,omitempty"`
		PrevCursor string `json:"prev_cursor,omitempty"`
		HasMore    bool   `json:"has_more"`
		TotalCount int64  `json:"total_count,omitempty"`
		Count      int    `json:"count"`
	} `json:"pagination"`
}

// DefaultPagination returns default pagination settings
func DefaultPagination() CursorPagination {
	return CursorPagination{
		Limit:     20,
		Direction: "next",
		SortField: "id",
		SortOrder: "desc",
	}
}

// ParseFromRequest extracts pagination from query parameters
func ParseFromRequest(c *gin.Context) CursorPagination {
	p := DefaultPagination()

	if cursor := c.Query("cursor"); cursor != "" {
		p.Cursor = cursor
	}

	if limit := c.Query("limit"); limit != "" {
		if n, err := strconv.Atoi(limit); err == nil && n > 0 && n <= 100 {
			p.Limit = n
		}
	}

	if direction := c.Query("direction"); direction == "prev" {
		p.Direction = direction
	}

	if sortField := c.Query("sort"); sortField != "" {
		p.SortField = sortField
	}

	if sortOrder := c.Query("order"); sortOrder == "asc" {
		p.SortOrder = sortOrder
	}

	return p
}

// EncodeCursor creates an encoded cursor string
func EncodeCursor(data CursorData) string {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return ""
	}
	return base64.URLEncoding.EncodeToString(jsonData)
}

// DecodeCursor decodes a cursor string
func DecodeCursor(cursor string) (CursorData, error) {
	var data CursorData

	jsonData, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return data, fmt.Errorf("invalid cursor format: %v", err)
	}

	if err := json.Unmarshal(jsonData, &data); err != nil {
		return data, fmt.Errorf("invalid cursor data: %v", err)
	}

	return data, nil
}

// ApplyCursor applies cursor pagination to a GORM query
func (p *CursorPagination) ApplyCursor(db *gorm.DB) (*gorm.DB, error) {
	query := db

	// Apply sorting
	order := p.SortField + " " + strings.ToUpper(p.SortOrder)
	query = query.Order(order)

	// Apply cursor filter if present
	if p.Cursor != "" {
		cursorData, err := DecodeCursor(p.Cursor)
		if err != nil {
			return nil, err
		}

		// Build cursor condition
		if p.Direction == "next" {
			if p.SortOrder == "asc" {
				query = query.Where(p.SortField+" > ? OR ("+p.SortField+" = ? AND id > ?)",
					cursorData.Value, cursorData.Value, cursorData.ID)
			} else {
				query = query.Where(p.SortField+" < ? OR ("+p.SortField+" = ? AND id < ?)",
					cursorData.Value, cursorData.Value, cursorData.ID)
			}
		} else {
			// Previous direction (reverse order)
			if p.SortOrder == "asc" {
				query = query.Where(p.SortField+" < ? OR ("+p.SortField+" = ? AND id < ?)",
					cursorData.Value, cursorData.Value, cursorData.ID)
			} else {
				query = query.Where(p.SortField+" > ? OR ("+p.SortField+" = ? AND id > ?)",
					cursorData.Value, cursorData.Value, cursorData.ID)
			}
		}
	}

	// Apply limit (+1 to check if there are more results)
	return query.Limit(p.Limit + 1), nil
}

// BuildResponse builds the paginated response with cursors
func (p *CursorPagination) BuildResponse(data interface{}, totalCount int64) PaginatedResponse {
	var response PaginatedResponse

	// Get data slice using reflection
	dataSlice, ok := data.([]interface{})
	if !ok {
		// Try to handle specific types
		response.Data = data
		response.Pagination.Count = int(totalCount)
		return response
	}

	count := len(dataSlice)
	hasMore := count > p.Limit

	// Remove the extra item used for checking has_more
	if hasMore {
		dataSlice = dataSlice[:p.Limit]
		count = p.Limit
	}

	// Generate next cursor
	if hasMore && count > 0 {
		lastItem := dataSlice[count-1]
		if itemMap, ok := lastItem.(map[string]interface{}); ok {
			nextCursor := CursorData{
				ID:        itemMap["id"],
				Value:     itemMap[p.SortField],
				SortField: p.SortField,
			}
			response.Pagination.NextCursor = EncodeCursor(nextCursor)
		}
	}

	// Generate prev cursor (if we have data and it's not the first page)
	if p.Cursor != "" && count > 0 {
		firstItem := dataSlice[0]
		if itemMap, ok := firstItem.(map[string]interface{}); ok {
			prevCursor := CursorData{
				ID:        itemMap["id"],
				Value:     itemMap[p.SortField],
				SortField: p.SortField,
			}
			response.Pagination.PrevCursor = EncodeCursor(prevCursor)
		}
	}

	response.Data = dataSlice
	response.Pagination.HasMore = hasMore
	response.Pagination.TotalCount = totalCount
	response.Pagination.Count = count

	return response
}

// SearchParams contains search parameters
type SearchParams struct {
	Query      string            `json:"q"`
	Fields     []string          `json:"fields"`
	Filters    map[string]string `json:"filters"`
	Pagination CursorPagination  `json:"pagination"`
}

// ParseSearchFromRequest extracts search parameters
func ParseSearchFromRequest(c *gin.Context) SearchParams {
	params := SearchParams{
		Pagination: ParseFromRequest(c),
		Filters:    make(map[string]string),
	}

	// Search query
	if q := c.Query("q"); q != "" {
		params.Query = q
	}

	// Search fields
	if fields := c.Query("fields"); fields != "" {
		params.Fields = strings.Split(fields, ",")
	}

	// Filters (any query param starting with filter_)
	for key, values := range c.Request.URL.Query() {
		if strings.HasPrefix(key, "filter_") {
			filterKey := strings.TrimPrefix(key, "filter_")
			if len(values) > 0 {
				params.Filters[filterKey] = values[0]
			}
		}
	}

	return params
}

// ApplyFullTextSearch applies full-text search to query
func (sp *SearchParams) ApplyFullTextSearch(db *gorm.DB, tableName string) *gorm.DB {
	if sp.Query == "" || len(sp.Fields) == 0 {
		return db
	}

	// Build search conditions
	var conditions []string
	var values []interface{}

	for _, field := range sp.Fields {
		conditions = append(conditions, fmt.Sprintf("%s.%s ILIKE ?", tableName, field))
		values = append(values, "%"+sp.Query+"%")
	}

	if len(conditions) > 0 {
		db = db.Where(strings.Join(conditions, " OR "), values...)
	}

	return db
}

// ApplyFilters applies filter conditions to query
func (sp *SearchParams) ApplyFilters(db *gorm.DB, tableName string) *gorm.DB {
	for field, value := range sp.Filters {
		db = db.Where(fmt.Sprintf("%s.%s = ?", tableName, field), value)
	}
	return db
}

// OffsetPagination provides traditional offset-based pagination
type OffsetPagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// ParseOffsetPagination parses offset pagination from request
func ParseOffsetPagination(c *gin.Context) OffsetPagination {
	p := OffsetPagination{
		Page:  1,
		Limit: 20,
	}

	if page := c.Query("page"); page != "" {
		if n, err := strconv.Atoi(page); err == nil && n > 0 {
			p.Page = n
		}
	}

	if limit := c.Query("limit"); limit != "" {
		if n, err := strconv.Atoi(limit); err == nil && n > 0 && n <= 100 {
			p.Limit = n
		}
	}

	return p
}

// Offset returns the offset for the query
func (p *OffsetPagination) Offset() int {
	return (p.Page - 1) * p.Limit
}

// BuildOffsetResponse builds response with offset pagination
func (p *OffsetPagination) BuildOffsetResponse(data interface{}, totalCount int64) gin.H {
	totalPages := int(totalCount) / p.Limit
	if int(totalCount)%p.Limit > 0 {
		totalPages++
	}

	return gin.H{
		"data": data,
		"pagination": gin.H{
			"page":        p.Page,
			"limit":       p.Limit,
			"total_count": totalCount,
			"total_pages": totalPages,
			"has_next":    p.Page < totalPages,
			"has_prev":    p.Page > 1,
		},
	}
}

// WriteError writes a pagination error response
func WriteError(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{
		"error":   message,
		"success": false,
	})
}

// WritePaginatedResponse writes a successful paginated response
func WritePaginatedResponse(c *gin.Context, response PaginatedResponse) {
	c.JSON(http.StatusOK, response)
}

// ParseDateRange parses date range filters from request
func ParseDateRange(c *gin.Context, fieldName string) (start, end *time.Time) {
	if startStr := c.Query(fieldName + "_from"); startStr != "" {
		if t, err := time.Parse(time.RFC3339, startStr); err == nil {
			start = &t
		}
	}

	if endStr := c.Query(fieldName + "_to"); endStr != "" {
		if t, err := time.Parse(time.RFC3339, endStr); err == nil {
			end = &t
		}
	}

	return start, end
}
