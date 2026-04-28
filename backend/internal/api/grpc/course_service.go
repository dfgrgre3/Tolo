package grpc

import (
	"context"
	"thanawy-backend/internal/db"
	"thanawy-backend/internal/models"
	thanawyv1 "thanawy-backend/internal/proto/thanawy/v1"
	"thanawy-backend/internal/proto/thanawy/v1/thanawyv1connect"

	"connectrpc.com/connect"
)

type CourseServiceServer struct {
	thanawyv1.UnimplementedCourseServiceServer
}

func (s *CourseServiceServer) GetCourses(ctx context.Context, req *thanawyv1.GetCoursesRequest) (*thanawyv1.GetCoursesResponse, error) {
	var subjects []models.Subject
	if err := db.DB.Find(&subjects).Error; err != nil {
		return nil, err
	}

	var protoCourses []*thanawyv1.Course
	for _, s := range subjects {
		protoCourses = append(protoCourses, &thanawyv1.Course{
			Id:          s.ID,
			Title:       s.Name,
			Description: strPtr(s.Description),
			TeacherName: strPtr(s.InstructorName),
		})
	}

	return &thanawyv1.GetCoursesResponse{
		Courses: protoCourses,
	}, nil
}

func (s *CourseServiceServer) GetCourse(ctx context.Context, req *thanawyv1.GetCourseRequest) (*thanawyv1.GetCourseResponse, error) {
	var subject models.Subject
	if err := db.DB.First(&subject, "id = ?", req.Id).Error; err != nil {
		return nil, err
	}

	return &thanawyv1.GetCourseResponse{
		Course: &thanawyv1.Course{
			Id:          subject.ID,
			Title:       subject.Name,
			Description: strPtr(subject.Description),
			TeacherName: strPtr(subject.InstructorName),
		},
	}, nil
}

// Connect Wrapper
type CourseConnectHandler struct {
	thanawyv1connect.UnimplementedCourseServiceHandler
	Svc *CourseServiceServer
}

func (h *CourseConnectHandler) GetCourses(ctx context.Context, req *connect.Request[thanawyv1.GetCoursesRequest]) (*connect.Response[thanawyv1.GetCoursesResponse], error) {
	res, err := h.Svc.GetCourses(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(res), nil
}

func (h *CourseConnectHandler) GetCourse(ctx context.Context, req *connect.Request[thanawyv1.GetCourseRequest]) (*connect.Response[thanawyv1.GetCourseResponse], error) {
	res, err := h.Svc.GetCourse(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(res), nil
}

func strPtr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
