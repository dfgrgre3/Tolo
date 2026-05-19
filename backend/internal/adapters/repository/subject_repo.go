package repository

import (
	"context"
	"time"

	"thanawy-backend/internal/domain/subject"

	"gorm.io/gorm"
)

type subjectRepository struct {
	db *gorm.DB
}

func NewSubjectRepository(database *gorm.DB) subject.Repository {
	return &subjectRepository{db: database}
}

func (r *subjectRepository) Create(ctx context.Context, s *subject.Subject) error {
	now := time.Now()
	s.CreatedAt = now
	s.UpdatedAt = now

	record := toSubjectRecord(s)
	return r.db.WithContext(ctx).Create(record).Error
}

func (r *subjectRepository) FindByID(ctx context.Context, id string) (*subject.Subject, error) {
	var record subjectRecord
	if err := r.db.WithContext(ctx).Where("id = ?", id).First(&record).Error; err != nil {
		return nil, err
	}
	return record.toDomain(), nil
}

func (r *subjectRepository) FindBySlug(ctx context.Context, slug string) (*subject.Subject, error) {
	var record subjectRecord
	if err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&record).Error; err != nil {
		return nil, err
	}
	return record.toDomain(), nil
}

func (r *subjectRepository) Update(ctx context.Context, s *subject.Subject) error {
	s.UpdatedAt = time.Now()
	record := toSubjectRecord(s)
	return r.db.WithContext(ctx).Save(record).Error
}

func (r *subjectRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&subjectRecord{}).Error
}

func (r *subjectRepository) List(ctx context.Context, filter subject.ListSubjectsFilter) (subject.ListSubjectsResult, error) {
	query := r.db.WithContext(ctx).Model(&subjectRecord{})

	if filter.CategoryID != nil {
		query = query.Where("categoryId = ?", *filter.CategoryID)
	}
	if filter.Level != nil {
		query = query.Where("level = ?", *filter.Level)
	}
	if filter.IsPublished != nil {
		query = query.Where("isPublished = ?", *filter.IsPublished)
	}
	if filter.IsActive != nil {
		query = query.Where("isActive = ?", *filter.IsActive)
	}
	if filter.IsFeatured != nil {
		query = query.Where("isFeatured = ?", *filter.IsFeatured)
	}
	if filter.Search != nil {
		search := "%" + *filter.Search + "%"
		query = query.Where("name ILIKE ? OR description ILIKE ?", search, search)
	}

	var total int64
	query.Count(&total)

	var records []subjectRecord
	query.Order("created_at DESC").
		Limit(filter.Limit).
		Offset((filter.Page - 1) * filter.Limit).
		Find(&records)

	subjects := make([]subject.Subject, len(records))
	for i, r := range records {
		subjects[i] = *r.toDomain()
	}

	totalPages := (total + int64(filter.Limit) - 1) / int64(filter.Limit)

	return subject.ListSubjectsResult{
		Subjects:   subjects,
		Total:      total,
		Page:       filter.Page,
		Limit:      filter.Limit,
		TotalPages: totalPages,
	}, nil
}

func (r *subjectRepository) UpdateCurriculum(ctx context.Context, subjectID string, curriculum subject.CurriculumInput) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("subjectId = ?", subjectID).Delete(&topicRecord{}).Error; err != nil {
			return err
		}

		for _, topicInput := range curriculum.Topics {
			topic := topicRecord{
				ID:        topicInput.ID,
				SubjectID: subjectID,
				Title:     topicInput.Title,
				Order:     topicInput.Order,
				CreatedAt: time.Now(),
			}
			if err := tx.Create(&topic).Error; err != nil {
				return err
			}

			for _, subTopicInput := range topicInput.SubTopics {
				subTopic := subTopicRecord{
					ID:          subTopicInput.ID,
					TopicID:     topic.ID,
					Title:       subTopicInput.Title,
					Type:        subTopicInput.Type,
					Order:       subTopicInput.Order,
					IsFree:      subTopicInput.IsFree,
					VideoUrl:    subTopicInput.VideoUrl,
					Duration:    subTopicInput.Duration,
					DurationMin: subTopicInput.DurationMin,
					Description: subTopicInput.Description,
					CreatedAt:   time.Now(),
				}
				if err := tx.Create(&subTopic).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *subjectRepository) GetCurriculum(ctx context.Context, subjectID string) ([]subject.Topic, error) {
	var topics []topicRecord
	if err := r.db.WithContext(ctx).Where("subjectId = ?", subjectID).Order("\"order\" ASC").Find(&topics).Error; err != nil {
		return nil, err
	}

	result := make([]subject.Topic, len(topics))
	for i, topic := range topics {
		var subTopics []subTopicRecord
		r.db.WithContext(ctx).Where("topicId = ?", topic.ID).Order("\"order\" ASC").Find(&subTopics)

		subTopicDomain := make([]subject.SubTopic, len(subTopics))
		for j, st := range subTopics {
			subTopicDomain[j] = *st.toDomain()
		}

		result[i] = *topic.toDomain(subTopicDomain)
	}

	return result, nil
}

func (r *subjectRepository) CountByCategory(ctx context.Context, categoryID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&subjectRecord{}).Where("categoryId = ?", categoryID).Count(&count).Error
	return count, err
}

func (r *subjectRepository) CountTotal(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&subjectRecord{}).Count(&count).Error
	return count, err
}

type subjectRecord struct {
	ID                     string    `gorm:"column:id;primaryKey;type:uuid"`
	Name                   string    `gorm:"column:name"`
	NameAr                 *string   `gorm:"column:name_ar"`
	Code                   *string   `gorm:"column:code"`
	Description            *string   `gorm:"column:description"`
	Icon                   *string   `gorm:"column:icon"`
	Color                  *string   `gorm:"column:color"`
	Type                   string    `gorm:"column:type"`
	Level                  *string   `gorm:"column:level"`
	Slug                   *string   `gorm:"column:slug"`
	ThumbnailUrl           *string   `gorm:"column:thumbnail_url"`
	TrailerUrl             *string   `gorm:"column:trailer_url"`
	SeoTitle               *string   `gorm:"column:seo_title"`
	SeoDescription         *string   `gorm:"column:seo_description"`
	InstructorName         *string   `gorm:"column:instructor_name"`
	InstructorId           *string   `gorm:"column:instructor_id"`
	CategoryId             *string   `gorm:"column:category_id"`
	Price                  float64   `gorm:"column:price"`
	IsFree                 bool      `gorm:"column:is_free"`
	IsPublished            bool      `gorm:"column:is_published"`
	IsActive               bool      `gorm:"column:isActive"`
	IsFeatured             bool      `gorm:"column:is_featured"`
	Rating                 float64   `gorm:"column:rating"`
	EnrolledCount          int       `gorm:"column:enrolledCount"`
	DurationHours          *float64  `gorm:"column:duration_hours"`
	TrailerDurationMinutes *int      `gorm:"column:trailer_duration_minutes"`
	Language               *string   `gorm:"column:language"`
	CreatedAt              time.Time `gorm:"column:created_at"`
	UpdatedAt              time.Time `gorm:"column:updated_at"`
}

func (subjectRecord) TableName() string {
	return "Subject"
}

type topicRecord struct {
	ID        string    `gorm:"column:id;primaryKey;type:uuid"`
	SubjectID string    `gorm:"column:subjectId"`
	Title     string    `gorm:"column:title"`
	Order     int       `gorm:"column:order"`
	CreatedAt time.Time `gorm:"column:created_at"`
}

func (topicRecord) TableName() string {
	return "Topic"
}

type subTopicRecord struct {
	ID          string    `gorm:"column:id;primaryKey;type:uuid"`
	TopicID     string    `gorm:"column:topicId"`
	Title       string    `gorm:"column:title"`
	Type        string    `gorm:"column:type"`
	Order       int       `gorm:"column:order"`
	IsFree      bool      `gorm:"column:isFree"`
	VideoUrl    *string   `gorm:"column:videoUrl"`
	Duration    int       `gorm:"column:duration"`
	DurationMin int       `gorm:"column:durationMinutes"`
	Description *string   `gorm:"column:description"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (subTopicRecord) TableName() string {
	return "SubTopic"
}

func toSubjectRecord(s *subject.Subject) *subjectRecord {
	return &subjectRecord{
		ID:                     s.ID,
		Name:                   s.Name,
		NameAr:                 s.NameAr,
		Code:                   s.Code,
		Description:            s.Description,
		Icon:                   s.Icon,
		Color:                  s.Color,
		Type:                   s.Type,
		Level:                  s.Level,
		Slug:                   s.Slug,
		ThumbnailUrl:           s.ThumbnailUrl,
		TrailerUrl:             s.TrailerUrl,
		SeoTitle:               s.SeoTitle,
		SeoDescription:         s.SeoDescription,
		InstructorName:         s.InstructorName,
		InstructorId:           s.InstructorId,
		CategoryId:             s.CategoryId,
		Price:                  s.Price,
		IsFree:                 s.IsFree,
		IsPublished:            s.IsPublished,
		IsActive:               s.IsActive,
		IsFeatured:             s.IsFeatured,
		Rating:                 s.Rating,
		EnrolledCount:          s.EnrolledCount,
		DurationHours:          s.DurationHours,
		TrailerDurationMinutes: s.TrailerDurationMinutes,
		Language:               s.Language,
		CreatedAt:              s.CreatedAt,
		UpdatedAt:              s.UpdatedAt,
	}
}

func (r *subjectRecord) toDomain() *subject.Subject {
	return &subject.Subject{
		ID:                     r.ID,
		Name:                   r.Name,
		NameAr:                 r.NameAr,
		Code:                   r.Code,
		Description:            r.Description,
		Icon:                   r.Icon,
		Color:                  r.Color,
		Type:                   r.Type,
		Level:                  r.Level,
		Slug:                   r.Slug,
		ThumbnailUrl:           r.ThumbnailUrl,
		TrailerUrl:             r.TrailerUrl,
		SeoTitle:               r.SeoTitle,
		SeoDescription:         r.SeoDescription,
		InstructorName:         r.InstructorName,
		InstructorId:           r.InstructorId,
		CategoryId:             r.CategoryId,
		Price:                  r.Price,
		IsFree:                 r.IsFree,
		IsPublished:            r.IsPublished,
		IsActive:               r.IsActive,
		IsFeatured:             r.IsFeatured,
		Rating:                 r.Rating,
		EnrolledCount:          r.EnrolledCount,
		DurationHours:          r.DurationHours,
		TrailerDurationMinutes: r.TrailerDurationMinutes,
		Language:               r.Language,
		CreatedAt:              r.CreatedAt,
		UpdatedAt:              r.UpdatedAt,
	}
}

func (r *topicRecord) toDomain(subTopics []subject.SubTopic) *subject.Topic {
	return &subject.Topic{
		ID:        r.ID,
		SubjectID: r.SubjectID,
		Title:     r.Title,
		Order:     r.Order,
		SubTopics: subTopics,
		CreatedAt: r.CreatedAt,
	}
}

func (r *subTopicRecord) toDomain() *subject.SubTopic {
	return &subject.SubTopic{
		ID:          r.ID,
		TopicID:     r.TopicID,
		Title:       r.Title,
		Type:        r.Type,
		Order:       r.Order,
		IsFree:      r.IsFree,
		VideoUrl:    r.VideoUrl,
		Duration:    r.Duration,
		DurationMin: r.DurationMin,
		Description: r.Description,
		CreatedAt:   r.CreatedAt,
	}
}

type noOpSubjectPublisher struct{}

func NewNoOpSubjectPublisher() subject.EventPublisher {
	return &noOpSubjectPublisher{}
}

func (p *noOpSubjectPublisher) Publish(ctx context.Context, event subject.SubjectEvent) error {
	return nil
}
