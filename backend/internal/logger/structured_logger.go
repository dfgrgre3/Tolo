package logger

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"runtime"
	"strings"
	"time"

	"github.com/elastic/go-elasticsearch/v8"
	"github.com/gin-gonic/gin"
)

// LogLevel represents log severity levels
type LogLevel int

const (
	DebugLevel LogLevel = iota
	InfoLevel
	WarnLevel
	ErrorLevel
	FatalLevel
	// errorLogFormat is the format for error suffix in log strings
	errorLogFormat = " | Error: %s"
)

var levelNames = map[LogLevel]string{
	DebugLevel: "DEBUG",
	InfoLevel:  "INFO",
	WarnLevel:  "WARN",
	ErrorLevel: "ERROR",
	FatalLevel: "FATAL",
}

// StructuredLogger provides structured logging with context correlation
type StructuredLogger struct {
	minLevel LogLevel
	esClient *elasticsearch.Client
}

var defaultLogger = &StructuredLogger{minLevel: InfoLevel}

func init() {
	if os.Getenv("LOG_LEVEL") == "debug" {
		defaultLogger.minLevel = DebugLevel
	}

	if os.Getenv("ELASTICSEARCH_ENABLED") != "false" {
		esURL := os.Getenv("ELASTICSEARCH_URL")
		if esURL == "" {
			esURL = "http://localhost:9200"
		}

		cfg := elasticsearch.Config{
			Addresses: []string{esURL},
		}

		if user := os.Getenv("ELASTICSEARCH_USERNAME"); user != "" {
			cfg.Username = user
			cfg.Password = os.Getenv("ELASTICSEARCH_PASSWORD")
		}

		client, err := elasticsearch.NewClient(cfg)
		if err == nil {
			defaultLogger.esClient = client
			log.Printf("Elasticsearch logger initialized for Go at %s", esURL)
		} else {
			log.Printf("Failed to initialize Elasticsearch client: %v", err)
		}
	}
}

// LogEntry represents a single structured log entry
type LogEntry struct {
	Timestamp      time.Time              `json:"timestamp"`
	Level          string                 `json:"level"`
	Message        string                 `json:"message"`
	RequestID      string                 `json:"request_id,omitempty"`
	TraceID        string                 `json:"trace_id,omitempty"`
	UserID         string                 `json:"user_id,omitempty"`
	Service        string                 `json:"service,omitempty"`
	Endpoint       string                 `json:"endpoint,omitempty"`
	Method         string                 `json:"method,omitempty"`
	StatusCode     int                    `json:"status_code,omitempty"`
	Duration       int64                  `json:"duration_ms,omitempty"`
	Error          string                 `json:"error,omitempty"`
	StackTrace     string                 `json:"stack_trace,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	CallerFile     string                 `json:"caller_file,omitempty"`
	CallerLine     int                    `json:"caller_line,omitempty"`
	CallerFunction string                 `json:"caller_function,omitempty"`
}

// log logs a structured entry
func (l *StructuredLogger) log(level LogLevel, message string, fields map[string]interface{}) {
	if level < l.minLevel {
		return
	}

	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     levelNames[level],
		Message:   message,
		Metadata:  fields,
	}

	// Add caller information
	pc, file, line, ok := runtime.Caller(3)
	if ok {
		entry.CallerFile = file
		entry.CallerLine = line
		entry.CallerFunction = runtime.FuncForPC(pc).Name()
	}

	// Format as JSON-like string for better parsing
	logStr := fmt.Sprintf(
		"[%s] %s | RequestID: %s | %s:%d | %s",
		entry.Level,
		entry.Timestamp.Format(time.RFC3339),
		entry.RequestID,
		entry.CallerFile,
		entry.CallerLine,
		message,
	)

	if entry.Error != "" {
		logStr += fmt.Sprintf(errorLogFormat, entry.Error)
	}

	if len(entry.Metadata) > 0 {
		logStr += fmt.Sprintf(" | Data: %v", entry.Metadata)
	}

	// Send to Elasticsearch asynchronously
	if l.esClient != nil {
		go func(e LogEntry) {
			data, err := json.Marshal(e)
			if err != nil {
				return
			}

			index := fmt.Sprintf("thanawy-logs-%s", time.Now().Format("2006.01.02"))
			_, _ = l.esClient.Index(
				index,
				strings.NewReader(string(data)),
				l.esClient.Index.WithContext(context.Background()),
			)
		}(entry)
	}

	switch level {
	case FatalLevel:
		log.Fatal(logStr)
	default:
		log.Println(logStr)
	}
}

// Info logs an informational message
func (l *StructuredLogger) Info(message string, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}
	l.log(InfoLevel, message, metadata)
}

// Debug logs a debug message
func (l *StructuredLogger) Debug(message string, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}
	l.log(DebugLevel, message, metadata)
}

// Warn logs a warning message
func (l *StructuredLogger) Warn(message string, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}
	l.log(WarnLevel, message, metadata)
}

// Error logs an error message with optional error object
func (l *StructuredLogger) Error(message string, err error, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}

	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     levelNames[ErrorLevel],
		Message:   message,
		Metadata:  metadata,
	}

	if err != nil {
		entry.Error = err.Error()
		entry.StackTrace = getStackTrace()
	}

	pc, file, line, ok := runtime.Caller(2)
	if ok {
		entry.CallerFile = file
		entry.CallerLine = line
		entry.CallerFunction = runtime.FuncForPC(pc).Name()
	}

	logStr := fmt.Sprintf(
		"[%s] %s | %s:%d | %s",
		entry.Level,
		entry.Timestamp.Format(time.RFC3339),
		entry.CallerFile,
		entry.CallerLine,
		message,
	)

	if entry.Error != "" {
		logStr += fmt.Sprintf(errorLogFormat, entry.Error)
	}

	log.Println(logStr)
}

// Fatal logs a fatal error and exits
func (l *StructuredLogger) Fatal(message string, err error) {
	entry := LogEntry{
		Timestamp: time.Now(),
		Level:     levelNames[FatalLevel],
		Message:   message,
	}

	if err != nil {
		entry.Error = err.Error()
		entry.StackTrace = getStackTrace()
	}

	logStr := fmt.Sprintf("[%s] %s | %s", entry.Level, entry.Timestamp.Format(time.RFC3339), message)
	if entry.Error != "" {
		logStr += fmt.Sprintf(errorLogFormat, entry.Error)
	}

	log.Fatal(logStr)
}

// WithContext adds context information to logging
func (l *StructuredLogger) WithContext(ctx context.Context) *ContextLogger {
	return &ContextLogger{
		logger: l,
		ctx:    ctx,
	}
}

// Global methods
func Info(message string, fields ...map[string]interface{}) {
	defaultLogger.Info(message, fields...)
}

func Debug(message string, fields ...map[string]interface{}) {
	defaultLogger.Debug(message, fields...)
}

func Warn(message string, fields ...map[string]interface{}) {
	defaultLogger.Warn(message, fields...)
}

func Error(message string, err error, fields ...map[string]interface{}) {
	defaultLogger.Error(message, err, fields...)
}

func Fatal(message string, err error) {
	defaultLogger.Fatal(message, err)
}

// ContextLogger provides logging with request context
type ContextLogger struct {
	logger *StructuredLogger
	ctx    context.Context
}

// Info logs info with context
func (cl *ContextLogger) Info(message string, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}
	cl.enrichMetadata(metadata)
	cl.logger.Info(message, metadata)
}

// Error logs error with context
func (cl *ContextLogger) Error(message string, err error, fields ...map[string]interface{}) {
	metadata := make(map[string]interface{})
	if len(fields) > 0 {
		metadata = fields[0]
	}
	cl.enrichMetadata(metadata)
	cl.logger.Error(message, err, metadata)
}

// enrichMetadata adds context values to metadata
func (cl *ContextLogger) enrichMetadata(metadata map[string]interface{}) {
	// Add request ID if available
	if reqID := cl.ctx.Value("request_id"); reqID != nil {
		metadata["request_id"] = reqID
	}

	// Add trace ID if available
	if traceID := cl.ctx.Value("trace_id"); traceID != nil {
		metadata["trace_id"] = traceID
	}

	// Add user ID if available
	if userID := cl.ctx.Value("user_id"); userID != nil {
		metadata["user_id"] = userID
	}
}

// getStackTrace returns current stack trace as string
func getStackTrace() string {
	const depth = 16
	var pcs [depth]uintptr
	n := runtime.Callers(3, pcs[:])

	var trace string
	for i := 0; i < n; i++ {
		pc := pcs[i]
		fn := runtime.FuncForPC(pc)
		file, line := fn.FileLine(pc)
		trace += fmt.Sprintf("%s:%d %s\n", file, line, fn.Name())
	}
	return trace
}

// RequestLogger middleware for request logging
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		startTime := time.Now()

		// Generate request ID and trace ID
		requestID := c.GetString("request_id")
		traceID := c.GetString("trace_id")

		// Log incoming request
		Info(
			fmt.Sprintf("%s %s", c.Request.Method, c.Request.URL.Path),
			map[string]interface{}{
				"request_id": requestID,
				"trace_id":   traceID,
				"method":     c.Request.Method,
				"path":       c.Request.URL.Path,
				"ip":         c.ClientIP(),
				"user_agent": c.Request.UserAgent(),
			},
		)

		// Continue processing
		c.Next()

		// Log response
		duration := time.Since(startTime)
		if c.Writer.Status() >= 400 {
			Warn(
				fmt.Sprintf("%s %s - %d", c.Request.Method, c.Request.URL.Path, c.Writer.Status()),
				map[string]interface{}{
					"request_id":   requestID,
					"trace_id":     traceID,
					"method":       c.Request.Method,
					"path":         c.Request.URL.Path,
					"status":       c.Writer.Status(),
					"duration_ms":  duration.Milliseconds(),
					"ip":           c.ClientIP(),
					"content_type": c.ContentType(),
				},
			)
		} else {
			Debug(
				fmt.Sprintf("%s %s - %d", c.Request.Method, c.Request.URL.Path, c.Writer.Status()),
				map[string]interface{}{
					"request_id":  requestID,
					"trace_id":    traceID,
					"method":      c.Request.Method,
					"path":        c.Request.URL.Path,
					"status":      c.Writer.Status(),
					"duration_ms": duration.Milliseconds(),
					"ip":          c.ClientIP(),
				},
			)
		}
	}
}
