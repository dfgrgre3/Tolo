package router

import (
	"github.com/gin-gonic/gin"
	"thanawy-backend/internal/app"
	"thanawy-backend/internal/middleware"
	"thanawy-backend/internal/models"
)

// SetupHexagonalRoutes configures routes using the new Hexagonal Architecture handlers
// This runs alongside legacy routes for gradual migration
func SetupHexagonalRoutes(router *gin.Engine, handlers *app.Handlers) {
	if handlers == nil {
		return
	}

	// User Management (Hexagonal)
	admin := router.Group("/api/admin")
	admin.Use(middleware.Auth())
	admin.Use(middleware.AdminRequired())
	{
		// Replace legacy user routes with hexagonal handler
		admin.GET("/hex/users", middleware.PermissionRequired(models.PermUsersView), handlers.UserHandler.ListUsers)
		admin.GET("/hex/users/:id", middleware.PermissionRequired(models.PermUsersView), handlers.UserHandler.GetUser)
		admin.POST("/hex/users", middleware.PermissionRequired(models.PermUsersManage), handlers.UserHandler.CreateUser)
		admin.PATCH("/hex/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.UserHandler.UpdateUser)
		admin.DELETE("/hex/users/:id", middleware.PermissionRequired(models.PermUsersManage), handlers.UserHandler.DeleteUser)
	}

	// Subject Management (Hexagonal)
	{
		// Public subject routes
		public := router.Group("/api")
		public.GET("/hex/subjects", handlers.SubjectHandler.ListSubjects)
		public.GET("/hex/subjects/:id", handlers.SubjectHandler.GetSubject)
		public.GET("/hex/subjects/slug/:slug", handlers.SubjectHandler.GetSubject)

		// Admin subject routes
		admin := router.Group("/api/admin")
		admin.Use(middleware.Auth())
		admin.Use(middleware.AdminRequired())
		{
			admin.GET("/hex/subjects", middleware.PermissionRequired(models.PermSubjectsView), handlers.SubjectHandler.ListSubjects)
			admin.GET("/hex/subjects/:id", middleware.PermissionRequired(models.PermSubjectsView), handlers.SubjectHandler.GetSubject)
			admin.POST("/hex/subjects", middleware.PermissionRequired(models.PermSubjectsManage), handlers.SubjectHandler.CreateSubject)
			admin.PATCH("/hex/subjects/:id", middleware.PermissionRequired(models.PermSubjectsManage), handlers.SubjectHandler.UpdateSubject)
			admin.DELETE("/hex/subjects/:id", middleware.PermissionRequired(models.PermSubjectsManage), handlers.SubjectHandler.DeleteSubject)
			admin.GET("/hex/subjects/:id/curriculum", middleware.PermissionRequired(models.PermSubjectsView), handlers.SubjectHandler.GetCurriculum)
			admin.PATCH("/hex/subjects/:id/curriculum", middleware.PermissionRequired(models.PermSubjectsManage), handlers.SubjectHandler.UpdateCurriculum)
		}
	}
}
