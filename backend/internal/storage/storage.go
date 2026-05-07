package storage

import (
	"context"
	"io"
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
}

var GlobalStorage Storage
