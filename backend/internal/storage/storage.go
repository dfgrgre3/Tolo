package storage

import (
	"context"
	"io"
	"time"
)

// Storage defines the interface for file storage operations
type Storage interface {
	// Upload saves a file and returns its access URL
	Upload(ctx context.Context, filename string, content io.Reader, size int64, contentType string) (string, error)
	// GetURL returns a presigned or public URL for a file
	GetURL(ctx context.Context, filename string) (string, error)
	// Delete removes a file from storage
	Delete(ctx context.Context, filename string) error
	// List returns a list of files with the given prefix
	List(ctx context.Context, prefix string) ([]string, error)
	// Download returns the content of a file
	Download(ctx context.Context, filename string) (io.ReadCloser, error)
	// GeneratePresignedUploadURL returns a pre-signed URL for direct browser upload to S3/R2
	GeneratePresignedUploadURL(ctx context.Context, filename string, contentType string, expiry time.Duration) (string, error)
}

var GlobalStorage Storage
