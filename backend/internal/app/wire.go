package app

import (
	"thanawy-backend/internal/adapters/http"
	"thanawy-backend/internal/adapters/repository"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/domain/subject"
	"thanawy-backend/internal/domain/user"

	"gorm.io/gorm"
)

type Services struct {
	UserService    *user.Service
	SubjectService *subject.Service
}

type Handlers struct {
	UserHandler    *http.UserHandler
	SubjectHandler *http.SubjectHandler
}

func Initialize(database *gorm.DB) (*Services, *Handlers) {
	if database == nil {
		database = db.DB
	}

	userRepo := repository.NewUserRepository(database)
	userHasher := repository.NewBcryptHasher()
	userPublisher := repository.NewNoOpPublisher()
	userService := user.NewService(userRepo, userHasher, userPublisher)

	subjectRepo := repository.NewSubjectRepository(database)
	subjectPublisher := repository.NewNoOpSubjectPublisher()
	subjectService := subject.NewService(subjectRepo, subjectPublisher)

	services := &Services{
		UserService:    userService,
		SubjectService: subjectService,
	}

	handlers := &Handlers{
		UserHandler:    http.NewUserHandler(userService),
		SubjectHandler: http.NewSubjectHandler(subjectService),
	}

	return services, handlers
}
