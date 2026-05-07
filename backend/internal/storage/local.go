package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage implements Storage interface for local filesystem
type LocalStorage struct {
	basePath string
	baseURL  string
}

func NewLocalStorage(basePath, baseURL string) *LocalStorage {
	return &LocalStorage{
		basePath: basePath,
		baseURL:  strings.TrimSuffix(baseURL, "/"),
	}
}

func (l *LocalStorage) Upload(ctx context.Context, filename string, content io.Reader, size int64, contentType string) (string, error) {
	dst := filepath.Join(l.basePath, filename)
	
	// Ensure directory exists
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	f, err := os.Create(dst)
	if err != nil {
		return "", fmt.Errorf("failed to create file: %w", err)
	}
	defer f.Close()

	_, err = io.Copy(f, content)
	if err != nil {
		return "", fmt.Errorf("failed to copy content: %w", err)
	}

	return fmt.Sprintf("%s/%s", l.baseURL, filename), nil
}

func (l *LocalStorage) GetURL(ctx context.Context, filename string) (string, error) {
	return fmt.Sprintf("%s/%s", l.baseURL, filename), nil
}

func (l *LocalStorage) Delete(ctx context.Context, filename string) error {
	return os.Remove(filepath.Join(l.basePath, filename))
}

func (l *LocalStorage) List(ctx context.Context, prefix string) ([]string, error) {
	root := filepath.Join(l.basePath, prefix)
	var files []string
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			rel, _ := filepath.Rel(l.basePath, path)
			files = append(files, rel)
		}
		return nil
	})
	return files, err
}

func (l *LocalStorage) Download(ctx context.Context, filename string) (io.ReadCloser, error) {
	return os.Open(filepath.Join(l.basePath, filename))
}
