package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Storage implements Storage interface for S3-compatible storage (AWS S3, MinIO, Cloudflare R2)
type S3Storage struct {
	client    *minio.Client
	bucket    string
	publicURL string
}

func NewS3Storage(endpoint, accessKey, secretKey, bucket, region string, useSSL bool, publicURL string) (*S3Storage, error) {
	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
		Region: region,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to initialize s3 client: %w", err)
	}

	return &S3Storage{
		client:    client,
		bucket:    bucket,
		publicURL: strings.TrimSuffix(publicURL, "/"),
	}, nil
}

func (s *S3Storage) Upload(ctx context.Context, filename string, content io.Reader, size int64, contentType string) (string, error) {
	_, err := s.client.PutObject(ctx, s.bucket, filename, content, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to s3: %w", err)
	}

	return s.GetURL(ctx, filename)
}

func (s *S3Storage) GetURL(ctx context.Context, filename string) (string, error) {
	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", s.publicURL, filename), nil
	}

	presignedURL, err := s.client.PresignedGetObject(ctx, s.bucket, filename, time.Hour*24, nil)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned url: %w", err)
	}

	return presignedURL.String(), nil
}

func (s *S3Storage) Delete(ctx context.Context, filename string) error {
	return s.client.RemoveObject(ctx, s.bucket, filename, minio.RemoveObjectOptions{})
}

func (s *S3Storage) List(ctx context.Context, prefix string) ([]string, error) {
	var files []string
	objectCh := s.client.ListObjects(ctx, s.bucket, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})
	for object := range objectCh {
		if object.Err != nil {
			return nil, object.Err
		}
		files = append(files, object.Key)
	}
	return files, nil
}

func (s *S3Storage) Download(ctx context.Context, filename string) (io.ReadCloser, error) {
	return s.client.GetObject(ctx, s.bucket, filename, minio.GetObjectOptions{})
}

func (s *S3Storage) GeneratePresignedUploadURL(ctx context.Context, filename string, contentType string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)
	if contentType != "" {
		reqParams.Set("Content-Type", contentType)
	}

	presignedURL, err := s.client.PresignedPutObject(ctx, s.bucket, filename, expiry)
	if err != nil {
		return "", fmt.Errorf("failed to generate presigned upload url: %w", err)
	}

	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", s.publicURL, filename), nil
	}

	return presignedURL.String(), nil
}
