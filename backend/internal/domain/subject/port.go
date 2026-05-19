package subject

import (
	"context"
	"time"
)

type Repository interface {
	Create(ctx context.Context, subject *Subject) error
	FindByID(ctx context.Context, id string) (*Subject, error)
	FindBySlug(ctx context.Context, slug string) (*Subject, error)
	Update(ctx context.Context, subject *Subject) error
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, filter ListSubjectsFilter) (ListSubjectsResult, error)
	UpdateCurriculum(ctx context.Context, subjectID string, curriculum CurriculumInput) error
	GetCurriculum(ctx context.Context, subjectID string) ([]Topic, error)
	CountByCategory(ctx context.Context, categoryID string) (int64, error)
	CountTotal(ctx context.Context) (int64, error)
}

type EventPublisher interface {
	Publish(ctx context.Context, event SubjectEvent) error
}

type SubjectEvent struct {
	Type      string
	SubjectID string
	Timestamp time.Time
	Data      map[string]interface{}
}
